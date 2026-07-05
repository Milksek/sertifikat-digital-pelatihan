import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CertificateRow = {
  id: string;
  certificate_number: string | null;
  status: string | null;
  minted_at: string | null;
  token_id: string | null;
  tx_hash: string | null;
  metadata_uri: string | null;
  ipfs_image_uri: string | null;
};

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

function toGatewayUrl(uri: string | null) {
  if (!uri) return null;
  return uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;
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
    const { data: profile, error: profileError } = await admin
      .from("profil")
      .select("id, role, wallet_address")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil peserta tidak ditemukan." }, { status: 404 });
    }

    const wallet = String(profile.wallet_address || "").toLowerCase();
    if (!wallet) {
      return NextResponse.json({ items: [] });
    }

    const { data, error } = await admin
      .from("sertifikat")
      .select("id, certificate_number, status, minted_at, token_id, tx_hash, metadata_uri, ipfs_image_uri")
      .eq("participant_wallet", wallet)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message || "Gagal memuat sertifikat." }, { status: 500 });
    }

    const items = ((data || []) as CertificateRow[]).map((item) => ({
      ...item,
      metadata_url: toGatewayUrl(item.metadata_uri),
      image_url: toGatewayUrl(item.ipfs_image_uri),
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat sertifikat peserta." }, { status: 500 });
  }
}
