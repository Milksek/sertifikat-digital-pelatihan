import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage } from "viem";
import { randomBytes } from "node:crypto";

const NONCE_TTL_MS = 5 * 60 * 1000;
function generateSessionPassword() {
  return `ssdp-${randomBytes(32).toString("hex")}`;
}

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

async function writeProfileOrThrow(
  operation: Promise<{ error: { message?: string } | null }>,
  context: string,
) {
  const { error } = await operation;
  if (error) {
    throw new Error(`${context}: ${error.message || "Gagal menyimpan profil"}`);
  }
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

    // Verify wallet signature — prevents impersonation
    const valid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
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
    const timestamp = new Date(timestampMatch[1]).getTime();
    if (Date.now() - timestamp > NONCE_TTL_MS) {
      return NextResponse.json({ error: "Signature sudah kedaluwarsa (maks 5 menit)." }, { status: 401 });
    }
    
    const { data: profileData } = await supabaseAdmin.from("profil").select("nonce").eq("wallet_address", addr).maybeSingle();
    if (!profileData || profileData.nonce !== nonce) {
      return NextResponse.json({ error: "Nonce tidak valid atau sudah dipakai." }, { status: 401 });
    }
    
    await supabaseAdmin.from("profil").update({ nonce: null, nonce_timestamp: null }).eq("wallet_address", addr);

    const addr = walletAddress.toLowerCase();
    const syntheticEmail = `${addr.slice(2)}@wallet.local`;
    const supabaseAdmin = getAdmin();
    const supabaseAuth = getAuthClient();
    let { data: existing } = (await supabaseAdmin
      .from("profil")
      .select("*")
      .eq("wallet_address", addr)
      .maybeSingle()) as { data: any | null };

    let userId: string;
    let role: string;
    const sessionPassword = generateSessionPassword();
    let signInResult = await supabaseAuth.auth.signInWithPassword({
      email: syntheticEmail,
      password: sessionPassword,
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
        password: sessionPassword,
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
