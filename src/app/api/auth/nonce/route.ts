import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const NONCE_TTL_MS = 5 * 60 * 1000;

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

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ error: "Parameter wallet wajib diberikan." }, { status: 400 });
    }
    const addr = wallet.toLowerCase();
    const nonce = randomBytes(16).toString("hex");
    const timestamp = new Date().toISOString();
    const message = `SSDP Login\nWallet: ${addr}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();
    const supabaseAdmin = getAdmin();

    // Store nonce in dedicated auth_nonces table
    const { error } = await supabaseAdmin
      .from("auth_nonces")
      .upsert({
        wallet_address: addr,
        nonce,
        message,
        expires_at: expiresAt,
      }, { onConflict: "wallet_address" });

    if (error) {
      console.error("[auth/nonce] upsert error:", error.message);
      return NextResponse.json({ error: "Gagal menyimpan nonce." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message, nonce, timestamp });
  } catch (err: any) {
    console.error("[auth/nonce]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
