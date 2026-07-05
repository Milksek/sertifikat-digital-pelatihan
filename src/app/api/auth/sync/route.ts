import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage } from "viem";
import { randomBytes } from "node:crypto";

const NONCE_TTL_MS = 5 * 60 * 1000;
function generateSessionPassword() {
  return `ssdp-${randomBytes(32).toString("hex")}`;
}

const MASTER_WALLETS = (
  process.env.MASTER_WALLET_ADDRESS ??
  "0x1cb90a414ade635dcfa78e41a825c789edde4d8e"
).split(",").map((w) => w.trim().toLowerCase());
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
let _supabaseAuth: ReturnType<typeof createClient> | null = null;

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

function getAuthClient() {
  if (!_supabaseAuth) {
    _supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAuth;
}

async function writeProfileOrThrow(
  operation: Promise<{ error: { message?: string } | null }>,
  context: string,
) {
  const { error } = await operation;
  if (error) {
    throw new Error(`${context}: ${error.message || "Gagal menyimpan profil"}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, message, signature, fullName, email: bodyEmail, phone, nik } = body;

    if (!walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: "walletAddress, message, dan signature wajib diisi." },
        { status: 400 },
      );
    }

    // Fatal 5: Validate message prefix
    if (!message.startsWith("SSDP Login\n")) {
      return NextResponse.json({ error: "Format pesan login tidak valid." }, { status: 400 });
    }

    // Fatal 2: Initialize these BEFORE any usage
    const addr = walletAddress.toLowerCase();
    const supabaseAdmin = getAdmin();
    const supabaseAuth = getAuthClient();

    // Verify wallet signature (try-catch for malformed hex)
    let valid = false;
    try {
      valid = await verifyMessage({
        address: addr as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      valid = false;
    }
    if (!valid) {
      return NextResponse.json(
        { error: "Signature wallet tidak valid." },
        { status: 401 },
      );
    }

    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
    const timestampMatch = message.match(/Timestamp: (.+)/);
    const walletMatch = message.match(/Wallet: (0x[0-9a-fA-F]+)/);

    if (!nonceMatch || !timestampMatch || !walletMatch) {
      return NextResponse.json({ error: "Format pesan signature tidak valid." }, { status: 400 });
    }
    if (walletMatch[1].toLowerCase() !== addr) {
      return NextResponse.json({ error: "Wallet address di signature tidak cocok." }, { status: 400 });
    }

    const nonce = nonceMatch[1];
    
    // Validate nonce from auth_nonces table
    const { data: nonceRow } = await supabaseAdmin
      .from("auth_nonces")
      .select("nonce, message, expires_at")
      .eq("wallet_address", addr)
      .maybeSingle();

    if (!nonceRow || nonceRow.nonce !== nonce || nonceRow.message !== message) {
      return NextResponse.json({ error: "Nonce tidak valid atau sudah dipakai." }, { status: 401 });
    }

    if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Nonce sudah kedaluwarsa." }, { status: 401 });
    }

    // Delete nonce (single-use)
    await supabaseAdmin.from("auth_nonces").delete().eq("wallet_address", addr);

    const syntheticEmail = `${addr.slice(2)}@wallet.local`;
    let { data: existing } = (await supabaseAdmin
      .from("profil")
      .select("*")
      .eq("wallet_address", addr)
      .maybeSingle()) as { data: any | null };

    let userId: string;
    let role: string;
    const sessionPassword = generateSessionPassword();
    let signInResult;
    if (existing?.id) {
      // Fatal 1: Update password of existing user before sign-in
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: sessionPassword,
        user_metadata: { wallet_address: addr },
      });
      signInResult = await supabaseAuth.auth.signInWithPassword({
        email: syntheticEmail,
        password: sessionPassword,
      });
      userId = existing.id;
      role = MASTER_WALLETS.includes(addr)
        ? "admin"
        : existing.role ?? "participant";
      const profilePayload: any = {
        id: userId,
        wallet_address: addr,
        role,
      };
      if (fullName) profilePayload.full_name = fullName;
      if (bodyEmail) profilePayload.email = bodyEmail;
      if (phone) profilePayload.phone = phone;
      if (nik) profilePayload.nik = nik;
      await writeProfileOrThrow(
        (supabaseAdmin.from("profil") as any).upsert(profilePayload, { onConflict: "id" }),
        "Gagal upsert profil pengguna existing",
      );
      existing = { ...existing, ...profilePayload };
    } else {
      const { data: newUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: syntheticEmail,
          password: sessionPassword,
          email_confirm: true,
          user_metadata: { wallet_address: addr },
        });
      if (createErr || !newUser?.user)
        return NextResponse.json(
          { error: "Gagal membuat akun: " + createErr?.message },
          { status: 500 },
        );

      userId = newUser.user.id;
      role = MASTER_WALLETS.includes(addr)
        ? "admin"
        : existing?.role ?? "participant";
      const profilePayload: any = {
        id: userId,
        wallet_address: addr,
        role,
      };
      if (fullName) profilePayload.full_name = fullName;
      if (bodyEmail) profilePayload.email = bodyEmail;
      if (phone) profilePayload.phone = phone;
      if (nik) profilePayload.nik = nik;

      await writeProfileOrThrow(
        (supabaseAdmin.from("profil") as any).upsert(profilePayload, {
          onConflict: "id",
        }),
        "Gagal upsert profil pengguna baru",
      );
      existing = { ...existing, ...profilePayload };

      signInResult = await supabaseAuth.auth.signInWithPassword({
        email: syntheticEmail,
        password: sessionPassword,
      });
    }

    if (fullName || bodyEmail || phone || nik || MASTER_WALLETS.includes(addr)) {
      const updatePayload: any = {};
      if (MASTER_WALLETS.includes(addr)) updatePayload.role = "admin";
      if (fullName) updatePayload.full_name = fullName;
      if (bodyEmail) updatePayload.email = bodyEmail;
      if (phone) updatePayload.phone = phone;
      if (nik) updatePayload.nik = nik;
      if (Object.keys(updatePayload).length) {
        await writeProfileOrThrow(
          (supabaseAdmin.from("profil") as any).update(updatePayload).eq("id", userId),
          "Gagal update profil setelah sinkronisasi",
        );
        existing = { ...existing, ...updatePayload };
        if (updatePayload.role) role = updatePayload.role;
      }
    }


    if (signInResult.error || !signInResult.data.session?.access_token) {
      return NextResponse.json(
        { error: "Gagal membuat sesi login: " + (signInResult.error?.message || "Session tidak tersedia") },
        { status: 500 },
      );
    }
    const accessToken = signInResult.data.session.access_token;
    const isNewUser = !MASTER_WALLETS.includes(addr) && !existing?.full_name;
    return NextResponse.json({
      success: true,
      isNewUser,
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
