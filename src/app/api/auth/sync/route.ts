import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MASTER_WALLET = (
  process.env.MASTER_WALLET_ADDRESS ??
  "0x1cb90a414ade635dcfa78e41a825c789edde4d8e"
).toLowerCase();
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

function normalizeRole(addr: string, role?: string | null) {
  return addr === MASTER_WALLET ? "admin" : role ?? "participant";
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
    const { walletAddress, fullName, email: bodyEmail, phone, nik, role: bodyRole } = body;
    if (!walletAddress)
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    const addr = walletAddress.toLowerCase();
    const syntheticEmail = `${addr.slice(2)}@wallet.local`;
    const syntheticPassword = `${addr}-ssdp-wallet-login`;
    const supabaseAdmin = getAdmin();
    const supabaseAuth = getAuthClient();
    let { data: existing } = (await supabaseAdmin
      .from("profil")
      .select("*")
      .eq("wallet_address", addr)
      .maybeSingle()) as { data: any | null };
    if (existing) existing = { ...existing, role: normalizeRole(addr, existing.role) };
    let userId: string;
    let role: string;
    let signInResult = await supabaseAuth.auth.signInWithPassword({
      email: syntheticEmail,
      password: syntheticPassword,
    });

    if (signInResult.data.session?.access_token && signInResult.data.user) {
      userId = signInResult.data.user.id;
      role = addr === MASTER_WALLET
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
        "Gagal upsert profil pengguna existing",
      );
      existing = { ...existing, ...profilePayload };
    } else {
      const { data: newUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: syntheticEmail,
          password: syntheticPassword,
          email_confirm: true,
          user_metadata: { wallet_address: addr },
        });
      if (createErr || !newUser?.user)
        return NextResponse.json(
          { error: "Gagal membuat akun: " + createErr?.message },
          { status: 500 },
        );

      userId = newUser.user.id;
      role = addr === MASTER_WALLET
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
        password: syntheticPassword,
      });
    }

    if (fullName || bodyEmail || phone || nik || addr === MASTER_WALLET) {
      const updatePayload: any = {};
      if (addr === MASTER_WALLET) updatePayload.role = "admin";
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
    const isNewUser = addr !== MASTER_WALLET && !existing?.full_name;
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


