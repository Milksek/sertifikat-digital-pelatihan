import { createClient } from "@supabase/supabase-js";
import { APP_NAME } from "@/lib/app-config";

async function getPublicProfile(wallet: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { profile: null, sertifikat: [] };
  const supabase = createClient(url, key);
  const { data: profile } = await supabase.from("profil").select("full_name,wallet_address,role").eq("wallet_address", wallet.toLowerCase()).maybeSingle();
  const { data: sertifikat } = await supabase.from("sertifikat").select("certificate_number,training_name,training_field,status,minted_at").eq("participant_wallet", wallet.toLowerCase()).order("created_at", { ascending: false });
  return { profile, sertifikat: sertifikat || [] };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;
  const { profile, sertifikat } = await getPublicProfile(wallet);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profil Publik Peserta</h1>
          <p className="text-slate-600 mt-2">Halaman publik milik {APP_NAME}.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Nama</p>
          <p className="font-semibold text-slate-900">{profile?.full_name || "Tidak tersedia"}</p>
          <p className="text-sm text-slate-500 mt-4">Wallet</p>
          <p className="font-medium text-slate-900 break-all">{wallet}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Sertifikat Publik</h2>
          <div className="space-y-3">
            {sertifikat.map((cert: any) => (
              <div key={cert.certificate_number} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-semibold text-slate-900">{cert.certificate_number}</p>
                <p className="text-sm text-slate-600">{cert.training_name} • {cert.training_field}</p>
              </div>
            ))}
            {sertifikat.length === 0 ? <p className="text-sm text-slate-500">Belum ada sertifikat publik.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
