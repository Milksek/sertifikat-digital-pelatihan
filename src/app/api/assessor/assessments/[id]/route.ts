import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Token login assessor tidak ditemukan." }, { status: 401 });
    }

    const authed = getAuthedClient(token);
    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Sesi assessor tidak valid." }, { status: 401 });
    }

    const admin = getAdmin();
    const { id } = await context.params;
    const { data: assessment, error: assessmentError } = await admin
      .from("penilaian")
      .select("id,status,recommendation,participant_id,assessor_id")
      .eq("id", id)
      .eq("assessor_id", userData.user.id)
      .maybeSingle();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: "Data penilaian tidak ditemukan." }, { status: 404 });
    }

    const { data: participant } = await admin
      .from("profil")
      .select("full_name,wallet_address,email,nik")
      .eq("id", assessment.participant_id)
      .maybeSingle();

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        status: assessment.status,
        recommendation: assessment.recommendation,
        participant: participant || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat detail penilaian.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
