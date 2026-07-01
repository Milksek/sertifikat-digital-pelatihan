import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Award, Shield, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet: rawWallet } = await params;
  const wallet = decodeURIComponent(rawWallet).toLowerCase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .ilike("wallet_address", wallet)
    .maybeSingle();

  return {
    title: profile?.full_name
      ? `Profil ${profile.full_name} — KOMPETEN.ID`
      : "Profil Publik — KOMPETEN.ID",
    description: "Lihat portofolio sertifikat kompetensi NFT yang terverifikasi di blockchain.",
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet: rawWallet } = await params;
  const wallet = decodeURIComponent(rawWallet).toLowerCase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .ilike("wallet_address", wallet)
    .maybeSingle();

  const { data: certs } = await supabase
    .from("certificates")
    .select(`
      id, certificate_number, token_id, tx_hash, ipfs_image_uri, status, minted_at,
      competency_schemes(name),
      assessments(
        evaluated_at,
        assessor:profiles!assessor_id(full_name)
      )
    `)
    .ilike("participant_wallet", wallet)
    .eq("status", "active")
    .order("minted_at", { ascending: false });

  if (!certs || certs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-5">
            <Award className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Belum Ada Sertifikat</h1>
          <p className="text-slate-500 text-sm mb-2">
            Wallet {wallet.slice(0, 6)}...{wallet.slice(-4)} belum memiliki sertifikat NFT aktif.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  const verifiedCount = certs.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-bold shadow-xl flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold">{displayName}</h1>
              
              <p className="text-slate-400 font-mono text-xs mt-2 break-all">
                {wallet}
              </p>
              <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-full font-medium">
                  <Shield className="w-3 h-3" />
                  {verifiedCount} Sertifikat Terverifikasi Blockchain
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          Sertifikat NFT Aktif
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certs.map((cert: any) => {
            const assessment = Array.isArray(cert.assessments)
              ? cert.assessments[0]
              : cert.assessments;
            const mintedAt = cert.minted_at
              ? format(new Date(cert.minted_at), "dd MMM yyyy", { locale: idLocale })
              : "—";
            const assessor = assessment?.assessor?.full_name;
            const verifyUrl = `/verify?cert=${cert.certificate_number}`;
            const explorerUrl = cert.tx_hash
              ? `https://amoy.polygonscan.com/tx/${cert.tx_hash}`
              : null;

            return (
              <div
                key={cert.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {cert.ipfs_image_uri ? (
                  <img
                    src={`https://ipfs.io/ipfs/${cert.ipfs_image_uri.replace("ipfs://", "")}`}
                    alt={cert.competency_schemes?.name || "Sertifikat"}
                    className="w-full aspect-[4/3] object-cover border-b border-slate-100"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center border-b border-slate-100">
                    <Award className="w-16 h-16 text-slate-300" />
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 mb-1">
                      <CheckCircle2 className="w-3 h-3" /> VALID
                    </span>
                    <h3 className="font-bold text-slate-900 leading-snug">
                      {cert.competency_schemes?.name}
                    </h3>
                    <p className="font-mono text-xs text-slate-400 mt-1">
                      {cert.certificate_number}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Diterbitkan: <span className="font-medium text-slate-700">{mintedAt}</span>
                    </div>
                    {assessor && (
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        Asesor: <span className="font-medium text-slate-700">{assessor}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={verifyUrl}
                      target="_blank"
                      className="flex-1 text-center text-xs font-medium px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Shield className="w-3 h-3" /> Verifikasi
                    </Link>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs font-medium px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3" /> Polygonscan
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs text-slate-400 border-t border-slate-100 pt-6">
          <p>
            Semua sertifikat di halaman ini terverifikasi di jaringan{" "}
            <span className="font-medium text-slate-600">Polygon Amoy Blockchain</span>
          </p>
          <Link href="/" className="text-blue-600 hover:underline mt-1 inline-block">
            Tentang KOMPETEN.ID
          </Link>
        </div>
      </div>
    </div>
  );
}
