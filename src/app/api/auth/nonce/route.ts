import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}

const NONCE_TTL_SECONDS = 30;

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    const addr = wallet.toLowerCase();
    const supabase = getAdmin();

    // Delete expired + old nonces for this wallet
    await (supabase.from("auth_nonces") as any)
      .delete()
      .eq("wallet_address", addr);

    const nonce = crypto.randomUUID();
    const { error } = await (supabase.from("auth_nonces") as any).insert({
      wallet_address: addr,
      nonce,
      expires_at: new Date(Date.now() + NONCE_TTL_SECONDS * 1000).toISOString(),
    });

    if (error) {
      throw new Error("Gagal menyimpan nonce: " + error.message);
    }

    const domain = req.nextUrl.host;
    const message = [
      "Login ke Sistem Sertifikat Digital Pelatihan",
      `Domain: ${domain}`,
      `Wallet: ${addr}`,
      `Nonce: ${nonce}`,
      `Waktu: ${Date.now()}`,
    ].join("\n");

    return NextResponse.json({
      nonce,
      message,
      expiresAt: new Date(Date.now() + NONCE_TTL_SECONDS * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error("[auth/nonce]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
