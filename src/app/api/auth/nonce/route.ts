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

const NONCE_EXPIRY_SECONDS = 60;

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    const addr = wallet.toLowerCase();
    const supabase = getAdmin();
    const nowIso = new Date().toISOString();

    // Clean stale rows and invalidate any older active nonce for this wallet.
    await (supabase.from("auth_nonces") as any)
      .delete()
      .lt("expires_at", nowIso);

    await (supabase.from("auth_nonces") as any)
      .update({ used_at: nowIso })
      .eq("wallet_address", addr)
      .is("used_at", null);

    const nonce = crypto.randomUUID();
    const domain = req.nextUrl.host;
    const issuedAt = Date.now();
    const expiresAt = new Date(issuedAt + NONCE_EXPIRY_SECONDS * 1000).toISOString();
    const message = [
      "Login ke Sistem Sertifikat Digital Pelatihan",
      `Domain: ${domain}`,
      `Wallet: ${addr}`,
      `Nonce: ${nonce}`,
      `Waktu: ${issuedAt}`,
    ].join("\n");

    const now = new Date().toISOString();
    const { error } = await (supabase.from("auth_nonces") as any).insert({
      wallet_address: addr,
      nonce,
      message,
      nonce_timestamp: now,
      created_at: now,
      expires_at: expiresAt,
      used_at: null,
    });

    if (error) {
      throw new Error("Gagal menyimpan nonce: " + error.message);
    }

    console.info("[auth/nonce] issued", {
      wallet: addr,
      issuedAt,
      expiresAt,
    });

    return NextResponse.json({
      nonce,
      message,
      expiresAt,
      expirySeconds: NONCE_EXPIRY_SECONDS,
    });
  } catch (err: any) {
    console.error("[auth/nonce]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
