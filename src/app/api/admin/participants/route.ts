import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET() {
  try {
    const supabaseAdmin = getAdmin();

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

    const assessCounts: Record<string, number> = (assessResult.data || []).reduce((acc: Record<string, number>, curr: Record<string, unknown>) => {
      const pid = curr?.participant_id as string | undefined;
      if (!pid) return acc;
      acc[pid] = (acc[pid] || 0) + 1;
      return acc;
    }, {});

    const certCounts: Record<string, number> = (certResult.data || []).reduce((acc: Record<string, number>, curr: Record<string, unknown>) => {
      const wallet = (curr?.participant_wallet as string | undefined)?.toLowerCase();
      if (!wallet) return acc;
      acc[wallet] = (acc[wallet] || 0) + 1;
      return acc;
    }, {});

    const participants = (rawProfiles || []).map((profile: Record<string, unknown>) => {
      const wallet = (profile.wallet_address as string | undefined)?.toLowerCase();
      return {
        ...profile,
        assessmentsCount: profile.id ? assessCounts[profile.id as string] || 0 : 0,
        certificatesCount: wallet ? certCounts[wallet] || 0 : 0,
      };
    });

    return NextResponse.json({ success: true, participants });
  } catch (error) {
    console.error("[admin/participants]", (error as Error)?.message || error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Gagal memuat peserta" },
      { status: 500 },
    );
  }
}
