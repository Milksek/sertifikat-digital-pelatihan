import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Profile = {
  id: string;
  role: string;
  full_name: string | null;
};

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

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Token login tidak ditemukan." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const assessorId = typeof body?.assessor_id === "string" ? body.assessor_id : "";

    if (!id || !assessorId) {
      return NextResponse.json({ error: "ID penilaian dan asesor wajib diisi." }, { status: 400 });
    }

    const authed = getAuthedClient(token);
    const admin = getAdmin();

    const { data: authUser, error: authError } = await authed.auth.getUser();
    if (authError || !authUser.user) {
      return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    }

    const actorId = authUser.user.id;

    const { data: actorProfile, error: actorProfileError } = await admin
      .from("profil")
      .select("id, role, full_name")
      .eq("id", actorId)
      .maybeSingle<Profile>();

    if (actorProfileError || !actorProfile || actorProfile.role !== "admin") {
      return NextResponse.json({ error: "Hanya admin yang bisa assign asesor." }, { status: 403 });
    }

    const { data: assessorProfile, error: assessorError } = await admin
      .from("profil")
      .select("id, role, full_name")
      .eq("id", assessorId)
      .eq("role", "assessor")
      .maybeSingle<Profile>();

    if (assessorError || !assessorProfile) {
      return NextResponse.json({ error: "Asesor tidak valid." }, { status: 400 });
    }

    const { data: assessment, error: assessmentError } = await admin
      .from("penilaian")
      .select("id, status, assessor_id")
      .eq("id", id)
      .maybeSingle();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: "Data penilaian tidak ditemukan." }, { status: 404 });
    }

    if (assessment.status !== "pending") {
      return NextResponse.json({ error: "Hanya penilaian pending yang bisa di-assign." }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("penilaian")
      .update({ assessor_id: assessorId, status: "in_progress" })
      .eq("id", id)
      .eq("status", "pending");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await admin.from("log_aktivitas").insert({
      actor_id: actorId,
      actor_role: "admin",
      activity_type: "assign_assessor",
      activity_detail: `Admin menugaskan asesor ${assessorProfile.full_name || assessorProfile.id} pada penilaian peserta`,
      reference_table: "penilaian",
      reference_id: id,
    });

    return NextResponse.json({ success: true, assessment_id: id, assessor_id: assessorId, status: "in_progress" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal assign asesor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}