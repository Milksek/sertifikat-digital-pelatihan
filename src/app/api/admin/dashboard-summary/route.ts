import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment belum lengkap.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getAuthedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase auth environment belum lengkap.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) throw new Error("Token login admin tidak ditemukan.");

  const authed = getAuthedClient(token);
  const { data: userData, error: userError } = await authed.auth.getUser();
  if (userError || !userData.user) throw new Error("Sesi admin tidak valid.");

  const admin = getAdmin();
  const { data: profile, error } = await admin
    .from("profil")
    .select("id, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    throw new Error("Hanya admin yang boleh mengakses ringkasan dashboard.");
  }

  return admin;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const [participantsResult, assessorsResult, assessmentsResult, certificatesResult, verificationsResult, logsResult] =
      await Promise.all([
        admin.from("profil").select("id", { count: "exact", head: true }).eq("role", "participant"),
        admin.from("profil").select("id", { count: "exact", head: true }).eq("role", "assessor"),
        admin.from("penilaian").select("id, status"),
        admin.from("sertifikat").select("id", { count: "exact", head: true }),
        admin.from("log_verifikasi").select("id", { count: "exact", head: true }),
        admin
          .from("log_aktivitas")
          .select("id, action, details, created_at, profil(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    const assessments = assessmentsResult.data || [];

    return NextResponse.json({
      totalParticipants: participantsResult.count ?? 0,
      totalAssessors: assessorsResult.count ?? 0,
      totalAssessments: assessments.length,
      totalCertificates: certificatesResult.count ?? 0,
      totalVerifications: verificationsResult.count ?? 0,
      approvedAssessments: assessments.filter((item) => item.status === "approved").length,
      certifiedAssessments: assessments.filter((item) => item.status === "certified").length,
      recentLogs: logsResult.data || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat dashboard admin." }, { status: 500 });
  }
}
