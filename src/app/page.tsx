import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import {
  Shield,
  Award,
  CheckCircle,
  FileText,
  UserCheck,
  Activity,
} from "lucide-react";

async function getLiveStats() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [certRes, participantRes, schemeRes] = await Promise.all([
      supabase.from("certificates").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "participant"),
      supabase.from("competency_schemes").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);
    return {
      certificates: certRes.count ?? 0,
      participants: participantRes.count ?? 0,
      schemes: schemeRes.count ?? 0,
    };
  } catch {
    return { certificates: 0, participants: 0, schemes: 0 };
  }
}
export default async function LandingPage() {
  const stats = await getLiveStats();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
          <Shield className="w-6 h-6 text-blue-600" />
          Kompeten.ID
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Features
          </Link>
          <Link
            href="/verify"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Verifikasi Sertifikat
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button className="bg-slate-900 text-white hover:bg-slate-800">
              Connect Wallet
            </Button>
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto flex flex-col items-center text-center">
          <Badge className="mb-6 py-1.5 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-sm rounded-full">
            Powered by Polygon & IPFS
          </Badge>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.15] max-w-4xl">
            Sertifikasi Kompetensi Terpercaya di{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Era Digital
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
            Platform sertifikasi berbasis blockchain yang menjamin keabsahan dan
            transparansi sertifikat pelatihan keahlian profesional Anda.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              >
                Mulai Sertifikasi
              </Button>
            </Link>
            <Link href="/verify">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base font-semibold h-14 px-8 border-slate-300"
              >
                Verifikasi Sertifikat
              </Button>
            </Link>
          </div>
        </section>
        <section className="py-12 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="py-4">
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  {stats.certificates.toLocaleString("id-ID")}+
                </div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Sertifikat Terbit
                </div>
              </div>
              <div className="py-4">
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  {stats.participants.toLocaleString("id-ID")}+
                </div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Peserta Tersertifikasi
                </div>
              </div>
              <div className="py-4">
                <div className="text-4xl font-bold text-slate-900 mb-2">{stats.schemes}</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Skema Kompetensi Aktif
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                How It Works
              </h2>
              <p className="mt-4 text-slate-600">
                Perjalanan mendapatkan sertifikat keahlian Anda melalui
                ekosistem KOMPETEN.ID.
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Daftar",
                  desc: "Buat profil kompetensi dan hubungkan wallet digital Anda.",
                  icon: UserCheck,
                },
                {
                  step: "2",
                  title: "Assessment",
                  desc: "Ikuti uji kompetensi sesuai dengan skema yang dipilih.",
                  icon: FileText,
                },
                {
                  step: "3",
                  title: "Evaluasi",
                  desc: "Penilaian berbasis standar SKKNI oleh asesor profesional.",
                  icon: Activity,
                },
                {
                  step: "4",
                  title: "NFT Sertifikat",
                  desc: "Terima Soulbound Token sebagai bukti yang sah & immutable.",
                  icon: Award,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="relative flex flex-col items-center text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-white shadow-sm border border-slate-200 text-blue-600 rounded-2xl flex items-center justify-center relative z-10">
                    <item.icon className="w-8 h-8" />
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm border-4 border-slate-50">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          id="features"
          className="py-24 bg-white border-t border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Keunggulan Sistem
              </h2>
              <p className="mt-4 text-slate-600">
                Dikembangkan dengan teknologi Web3 terbaru untuk keamanan
                maksimal.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Blockchain Immutable
                </h3>
                <p className="text-slate-600 text-sm">
                  Data sertifikat disimpan permanen di jaringan Polygon, tidak
                  dapat diubah atau dipalsukan.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Soulbound Token
                </h3>
                <p className="text-slate-600 text-sm">
                  NFT yang tidak dapat ditransfer (Non-Transferable), memastikan
                  kepemilikan mutlak oleh peserta.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Verifikasi Real-time
                </h3>
                <p className="text-slate-600 text-sm">
                  Pengecekan keabsahan sertifikat secara instan dan publik tanpa
                  memerlukan proses login.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Standar SKKNI
                </h3>
                <p className="text-slate-600 text-sm">
                  Validasi penilaian dirancang selaras dengan Standar Kompetensi
                  Kerja Nasional Indonesia.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 mb-8 border-b border-slate-800 pb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold tracking-tight text-white mb-4 text-xl">
              <Shield className="w-6 h-6 text-blue-500" />
              KOMPETEN.ID
            </div>
            <p className="text-sm max-w-sm">
              Sistem Sertifikasi Kompetensi Profesional Berbasis Blockchain yang
              terintegrasi dengan jaringan global.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Akses Cepat</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="#how-it-works"
                  className="hover:text-white transition-colors"
                >
                  Cara Kerja
                </Link>
              </li>
              <li>
                <Link
                  href="/verify"
                  className="hover:text-white transition-colors"
                >
                  Verifikasi Sertifikat
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-white transition-colors"
                >
                  Connect Wallet
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Informasi</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Dokumentasi API
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Hubungi Kami
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center text-sm">
          <p>
            © {new Date().getFullYear()} KOMPETEN.ID (Lembaga Sertifikasi
            Profesi). Hak Cipta Dilindungi Undang-Undang.
          </p>
        </div>
      </footer>
    </div>
  );
}
function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center font-semibold ${className}`}
    >
      {children}
    </div>
  );
}
