import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

let _supabaseAdmin = null;

function getAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabaseAdmin;
}

export async function GET() {
  try {
    const supabaseAdmin = getAdmin();
    const { data, error } = await supabaseAdmin
      .from("profil")
      .select("*")
      .eq("role", "assessor")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Gagal memuat asesor: ${error.message}`);
    }

    return NextResponse.json({ success: true, assessors: data || [] });
  } catch (error) {
    console.error("[admin/assessors]", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal memuat asesor" },
      { status: 500 },
    );
  }
}
