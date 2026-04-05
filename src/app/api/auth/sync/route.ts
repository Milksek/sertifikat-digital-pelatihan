import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
const MASTER_WALLET = (
  process.env.MASTER_WALLET_ADDRESS ??
  "0x1cb90a414ade635dcfa78e41a825c789edde4d8e"
).toLowerCase();
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
export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    if (!walletAddress)
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    const addr = walletAddress.toLowerCase();
    const email = `${addr}@wallet.KOMPETEN.ID.local`;
    const supabaseAdmin = getAdmin();
    let { data: existing } = (await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("wallet_address", addr)
      .maybeSingle()) as { data: any | null };
    let userId: string;
    let role: string;
    if (existing) {
      userId = existing.id;
      role = existing.role ?? "participant";
    } else {
      const { data: newUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: `${addr}-KOMPETEN.ID-salt`,
          email_confirm: true,
          user_metadata: { wallet_address: addr },
        });
      if (createErr || !newUser?.user)
        return NextResponse.json(
          { error: "Gagal membuat akun: " + createErr?.message },
          { status: 500 },
        );
      userId = newUser.user.id;
      role = addr === MASTER_WALLET ? "admin" : "participant";
      existing = { id: userId, wallet_address: addr, role };
      await (supabaseAdmin.from("profiles") as any).upsert(existing, {
        onConflict: "id",
      });
    }
    const jwtSecret = process.env.SUPABASE_JWT_SECRET!;
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await new SignJWT({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 86400)
      .sign(new TextEncoder().encode(jwtSecret));
    return NextResponse.json({
      success: true,
      isNewUser: !existing?.full_name,
      userId,
      role,
      accessToken,
      profile: existing,
    });
  } catch (err: any) {
    console.error("[auth/sync]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
