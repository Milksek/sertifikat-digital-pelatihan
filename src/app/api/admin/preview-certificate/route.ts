import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildCertificateNumber } from "@/lib/certificate-number";
import { TRAINING_NAME, TRAINING_FIELD } from "@/lib/app-config";

export const runtime = "nodejs";

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment belum lengkap.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getAuthedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase auth environment belum lengkap.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Token login admin tidak ditemukan." }, { status: 401 });
    }

    const authed = getAuthedClient(token);
    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profil")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya admin yang diperbolehkan." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId");
    if (!assessmentId) {
      return NextResponse.json({ error: "assessmentId wajib diberikan." }, { status: 400 });
    }

    const { data: assessment, error: assessmentError } = await admin
      .from("penilaian")
      .select(`
        id,
        status,
        participant_id,
        participant:profil!participant_id(full_name,wallet_address)
      `)
      .eq("id", assessmentId)
      .maybeSingle();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: "Data penilaian tidak ditemukan." }, { status: 404 });
    }

    
    const { data: existingCert } = await admin
      .from("sertifikat")
      .select("certificate_number")
      .eq("assessment_id", assessment.id)
      .maybeSingle();

    const certificateNumber = existingCert?.certificate_number || buildCertificateNumber(assessment.id);
    const issuedAt = new Date().toISOString();

    const templatePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "certificate_template.png");
    const templateBuffer = readFileSync(templatePath);
    const template = sharp(templateBuffer);
    const metadata = await template.metadata();

    const width = metadata.width ?? 1600;
    const height = metadata.height ?? 1200;
    const safeName = (assessment.participant?.full_name || "Peserta").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeTraining = TRAINING_NAME.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeField = TRAINING_FIELD.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const wallet = assessment.participant?.wallet_address || "0x0000000000000000000000000000000000000000";
    const shortWallet = wallet.length > 15 ? `${wallet.slice(0,6)}...${wallet.slice(-4)}` : wallet;
    const formattedDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

    const overlay = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .name { fill: #ffffff; font-size: ${Math.round(width * 0.048)}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
        .label { fill: #ffffff; font-size: ${Math.round(width * 0.015)}px; font-weight: 600; font-family: 'Poppins', sans-serif; letter-spacing: 1.2px; }
        .value { fill: #ffffff; font-size: ${Math.round(width * 0.018)}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
        .field { fill: #ffffff; font-size: ${Math.round(width * 0.015)}px; font-weight: 400; font-family: 'Poppins', sans-serif; }
      </style>
      <text x="64%" y="52%" text-anchor="middle" class="name">${safeName}</text>
      <text x="54%" y="73%" text-anchor="middle" class="value">${safeTraining}</text>
      <text x="68%" y="68%" text-anchor="middle" class="field">${safeField}</text>
      <text x="5%" y="5%" class="label">NOMOR SERTIFIKAT</text>
      <text x="5%" y="8%" class="value">${certificateNumber}</text>

      <text x="45%" y="78%" class="label">TANGGAL TERBIT</text>
      <text x="45%" y="81%" class="value">${formattedDate}</text>
      <text x="65%" y="78%" class="label">WALLET PESERTA</text>
      <text x="65%" y="81%" class="value">${shortWallet}</text>
    </svg>
  `;

    const imageBuffer = await template
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
      .png()
      .toBuffer();

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal men-generate preview sertifikat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
