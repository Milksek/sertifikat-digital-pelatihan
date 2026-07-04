import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);

    const { getAdminClient } = await import("@/lib/server-auth");
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
    console.error("[admin/assessors]", error?.message || error);
    const status = error.message?.includes("Akses ditolak") ? 403 : error.message?.includes("Token login") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal memuat asesor" },
      { status },
    );
  }
}
