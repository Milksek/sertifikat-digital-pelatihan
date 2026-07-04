import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser, getAdminClient } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireAdminUser(req);
    const admin = getAdminClient();

    const [participantsResult, assessorsResult, assessmentsResult, certificatesResult, verificationsResult, logsResult] =
      await Promise.all([
        admin.from("profil").select("id", { count: "exact", head: true }).eq("role", "participant"),
        admin.from("profil").select("id", { count: "exact", head: true }).eq("role", "assessor"),
        admin.from("penilaian").select("id, status"),
        admin.from("sertifikat").select("id", { count: "exact", head: true }),
        admin.from("log_verifikasi").select("id", { count: "exact", head: true }),
        admin
          .from("log_aktivitas")
          .select("id, activity_type, activity_detail, created_at, profil(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    const assessments = assessmentsResult.data || [];
    const rawLogs = logsResult.data || [];

    return NextResponse.json({
      totalParticipants: participantsResult.count ?? 0,
      totalAssessors: assessorsResult.count ?? 0,
      totalAssessments: assessments.length,
      totalCertificates: certificatesResult.count ?? 0,
      totalVerifications: verificationsResult.count ?? 0,
      approvedAssessments: assessments.filter((item) => item.status === "approved").length,
      certifiedAssessments: assessments.filter((item) => item.status === "certified").length,
      recentLogs: rawLogs.map((x: any) => ({
        ...x,
        action: x.activity_type,
        details: x.activity_detail,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat dashboard admin." }, { status: 500 });
  }
}
