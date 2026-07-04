import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

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
    const supabaseAdmin = getAdmin();

    const { error } = await supabaseAdmin
      .from("profil")
      .update({ nonce, nonce_timestamp: timestamp })
      .eq("wallet_address", addr);

    if (error) {
      const { data: existing } = await supabaseAdmin.from("profil").select("id").eq("wallet_address", addr).maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("profil").insert({ id: crypto.randomUUID(), wallet_address: addr, role: "participant", nonce, nonce_timestamp: timestamp });
      }
    }

    return NextResponse.json({ success: true, message, nonce, timestamp });
  } catch (err: any) {
    console.error("[auth/nonce]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
