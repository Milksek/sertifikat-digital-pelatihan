import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type AuthenticatedProfile = {
  id: string;
  role: string;
  wallet_address: string;
  full_name: string | null;
  email?: string | null;
};

export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment belum lengkap.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function getAuthedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase auth environment belum lengkap.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireAuthenticatedUser(req: NextRequest): Promise<AuthenticatedProfile> {
  const token = getBearerToken(req);
  if (!token) throw new Error("Token login tidak ditemukan.");

  const authed = getAuthedClient(token);
  const { data: userData, error: userError } = await authed.auth.getUser();
  if (userError || !userData.user) throw new Error("Sesi login tidak valid.");

  const admin = getAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profil")
    .select("id, role, wallet_address, full_name, email")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) throw new Error("Gagal memuat profil pengguna.");
  if (!profile) throw new Error("Profil pengguna tidak ditemukan.");

  return profile as AuthenticatedProfile;
}

export async function requireAdminUser(req: NextRequest): Promise<AuthenticatedProfile> {
  const profile = await requireAuthenticatedUser(req);
  if (profile.role !== "admin") {
    throw new Error("Akses ditolak. Hanya administrator yang diizinkan.");
  }
  return profile;
}

export async function requireAssessorUser(req: NextRequest): Promise<AuthenticatedProfile> {
  const profile = await requireAuthenticatedUser(req);
  if (profile.role !== "assessor" && profile.role !== "admin") {
    throw new Error("Akses ditolak. Hanya asesor atau administrator yang diizinkan.");
  }
  return profile;
}
