import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser, getAdminClient } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from("profil")
      .select("*")
      .eq("role", "assessor")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Gagal memuat asesor: ${error.message}`);
    }

    return NextResponse.json({ success: true, assessors: data || [] });
  } catch (error: any) {
    console.error("[admin/assessors] GET", error?.message || error);
    const status = error.message?.includes("Akses ditolak") ? 403 : error.message?.includes("Token login") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal memuat asesor" },
      { status },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminProfile = await requireAdminUser(req);
    const supabaseAdmin = getAdminClient();

    const body = await req.json();
    const { walletAddress, fullName, email, phone } = body;

    if (!walletAddress || !walletAddress.startsWith("0x") || walletAddress.length !== 42) {
      return NextResponse.json({ error: "Wallet address tidak valid." }, { status: 400 });
    }
    if (!fullName?.trim()) {
      return NextResponse.json({ error: "Nama asesor wajib diisi." }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email asesor wajib diisi." }, { status: 400 });
    }

    const addr = walletAddress.toLowerCase();
    const syntheticEmail = `${addr.slice(2)}@wallet.local`;
    const syntheticPassword = `${addr}-ssdp-wallet-login`;

    // Find existing profile by wallet
    const { data: existing } = await supabaseAdmin
      .from("profil")
      .select("id, role")
      .eq("wallet_address", addr)
      .maybeSingle();

    let userId: string;

    if (existing) {
      // Profile exists — upgrade role to assessor
      userId = existing.id;
      const { error: updateErr } = await supabaseAdmin
        .from("profil")
        .update({
          role: "assessor",
          full_name: fullName,
          email: email,
          phone: phone || null,
        })
        .eq("id", userId);

      if (updateErr) throw new Error(`Gagal update role asesor: ${updateErr.message}`);
    } else {
      // Create new auth user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password: syntheticPassword,
        email_confirm: true,
        user_metadata: { wallet_address: addr },
      });

      if (createErr || !newUser?.user) {
        throw new Error(`Gagal membuat akun asesor: ${createErr?.message}`);
      }

      userId = newUser.user.id;

      // Upsert profil with assessor role
      const { error: insertErr } = await supabaseAdmin.from("profil").upsert({
        id: userId,
        wallet_address: addr,
        full_name: fullName,
        email: email,
        phone: phone || null,
        role: "assessor",
      }, { onConflict: "id" });

      if (insertErr) throw new Error(`Gagal membuat profil asesor: ${insertErr.message}`);
    }

    // Log activity
    await supabaseAdmin.from("log_aktivitas").insert({
      actor_id: adminProfile.id,
      actor_role: "admin",
      activity_type: "tambah_asesor",
      activity_detail: `Admin ${adminProfile.full_name} menambahkan asesor ${fullName} (${addr})`,
    });

    return NextResponse.json({
      success: true,
      message: `Akun asesor untuk ${fullName} berhasil dibuat/diupdate.`,
      userId,
    });
  } catch (error: any) {
    console.error("[admin/assessors] POST", error?.message || error);
    const status = error.message?.includes("Akses ditolak") ? 403 : error.message?.includes("Token login") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal membuat asesor" },
      { status },
    );
  }
}
