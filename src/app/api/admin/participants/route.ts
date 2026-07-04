import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);

    const { getAdminClient } = await import("@/lib/server-auth");
    const supabaseAdmin = getAdminClient();

    const { data: rawProfiles, error: profileError } = await supabaseAdmin
      .from("profil")
      .select("id, full_name, nik, phone, email, wallet_address, created_at")
      .eq("role", "participant")
      .order("created_at", { ascending: false });

    if (profileError) {
      throw new Error(`Gagal memuat profil peserta: ${profileError.message}`);
    }

    const [assessResult, certResult] = await Promise.all([
      supabaseAdmin.from("penilaian").select("participant_id"),
      supabaseAdmin.from("sertifikat").select("participant_wallet"),
    ]);

    if (assessResult.error) {
      throw new Error(`Gagal memuat penilaian peserta: ${assessResult.error.message}`);
    }

    if (certResult.error) {
      throw new Error(`Gagal memuat sertifikat peserta: ${certResult.error.message}`);
    }

    const assessCounts = (assessResult.data || []).reduce((acc: Record<string, number>, curr) => {
      if (!curr?.participant_id) return acc;
      acc[curr.participant_id] = (acc[curr.participant_id] || 0) + 1;
      return acc;
    }, {});

    const certCounts = (certResult.data || []).reduce((acc: Record<string, number>, curr) => {
      if (!curr?.participant_wallet) return acc;
      const wallet = curr.participant_wallet.toLowerCase();
      acc[wallet] = (acc[wallet] || 0) + 1;
      return acc;
    }, {});

    const participants = (rawProfiles || []).map((profile) => {
      const wallet = profile.wallet_address?.toLowerCase();
      return {
        ...profile,
        assessmentsCount: profile.id ? assessCounts[profile.id] || 0 : 0,
        certificatesCount: wallet ? certCounts[wallet] || 0 : 0,
      };
    });

    return NextResponse.json({ success: true, participants });
  } catch (error: any) {
    console.error("[admin/participants]", error?.message || error);
    const status = error.message?.includes("Akses ditolak") ? 403 : error.message?.includes("Token login") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal memuat peserta" },
      { status },
    );
  }
}
