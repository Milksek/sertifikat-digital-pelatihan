import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderCertificatePng } from "@/lib/certificate-renderer";
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

    const a = assessment as unknown as { id: string; participant?: { full_name?: string | null; wallet_address?: string } | null };

    // Resolve certificate number if it already exists or generate a draft number
    const { data: existingCert } = await admin
      .from("sertifikat")
      .select("certificate_number")
      .eq("assessment_id", a.id)
      .maybeSingle();

    const certificateNumber = existingCert?.certificate_number || buildCertificateNumber(a.id);
    const issuedAt = new Date().toISOString();

    const imageBuffer = await renderCertificatePng({
      participantName: a.participant?.full_name || "Peserta",
      certificateNumber,
      trainingName: TRAINING_NAME,
      trainingField: TRAINING_FIELD,
      issuedAt,
      walletAddress: a.participant?.wallet_address || "0x0000000000000000000000000000000000000000",
      verifyUrl: `${req.nextUrl.origin}/verify?q=${certificateNumber}`,
    });

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
