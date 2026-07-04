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

export async function GET(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Token login tidak ditemukan." }, { status: 401 });
    }

    const authed = getAuthedClient(token);
    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: profile, error } = await admin
      .from("profil")
      .select("id, wallet_address, full_name, role, nik, email, phone")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat profil." }, { status: 500 });
  }
}
