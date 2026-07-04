import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment belum lengkap.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
    if (!wallet) {
      return NextResponse.json({ error: "Wallet wajib diisi." }, { status: 400 });
    }

    const admin = getAdmin();
    const { data: profile, error } = await admin
      .from("profil")
      .select("wallet_address, full_name")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat profil." }, { status: 500 });
  }
}
