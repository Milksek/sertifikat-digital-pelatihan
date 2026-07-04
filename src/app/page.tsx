import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { Shield, Award, CheckCircle, FileText, UserCheck, Activity } from "lucide-react";
import { APP_NAME, TRAINING_FIELD, TRAINING_NAME } from "@/lib/app-config";

async function getLiveStats() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return { sertifikat: 0, participants: 0 };

    const supabase = createClient(url, key);
    const [certRes, participantRes] = await Promise.all([
      supabase.from("sertifikat").select("id", { count: "exact", head: true }),
      supabase.from("profil").select("id", { count: "exact", head: true }).eq("role", "participant"),
    ]);

    return {
      sertifikat: certRes.count ?? 0,
      participants: participantRes.count ?? 0,
    };
  } catch {
    return { sertifikat: 0, participants: 0 };
  }
}

export default async function LandingPage() {
  const stats = await getLiveStats();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-slate-900">
            <Shield className="w-6 h-6 text-blue-600" />
            <span>{APP_NAME}</span>
          </div>
          <nav className="hidden md:flex items-center justify-center gap-6">
            <Link href="#alur" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Alur Sistem</Link>
            <Link href="#fitur" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Fitur</Link>
            <Link href="/verify" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Verifikasi Publik</Link>
          </nav>
          <div className="flex justify-end">
            <Link href="/login">
              <Button className="bg-slate-900 text-white hover:bg-slate-800">Masuk Portal</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="mb-6 py-1.5 px-4 bg-blue-50 text-blue-700 border border-blue-200 shadow-sm rounded-full text-sm font-medium inline-flex">
            Soulbound Token • Polygon Amoy • IPFS
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.15] max-w-5xl">
            Penerbitan dan Verifikasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Sertifikat Digital Pelatihan</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 font-normal leading-relaxed max-w-3xl">
            Platform untuk pelatihan <strong>{TRAINING_NAME}</strong> pada bidang <strong>{TRAINING_FIELD}</strong> dengan penerbitan sertifikat digital berbasis blockchain yang aman, transparan, dan mudah diverifikasi publik.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto text-base font-semibold h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                Masuk ke Sistem
              </Button>
            </Link>
            <Link href="/verify">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold h-14 px-8 border-slate-300">
                Verifikasi Sertifikat
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-12 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="py-4">
                <div className="text-4xl font-bold text-slate-900 mb-2">{stats.sertifikat.toLocaleString("id-ID")}+</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Sertifikat Terbit</div>
              </div>
              <div className="py-4">
                <div className="text-4xl font-bold text-slate-900 mb-2">{stats.participants.toLocaleString("id-ID")}+</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Peserta</div>
              </div>
              <div className="py-4">
                <div className="text-4xl font-bold text-slate-900 mb-2">1</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pelatihan Tetap</div>
              </div>
            </div>
          </div>
        </section>

        <section id="alur" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Alur Sistem</h2>
              <p className="mt-4 text-slate-600">Proses singkat dari pendaftaran hingga verifikasi publik.</p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "1", title: "Daftar", desc: "Peserta membuat profil dan menghubungkan wallet.", icon: UserCheck },
                { step: "2", title: "Penilaian", desc: "Peserta mengikuti penilaian pelatihan Junior Web Developer.", icon: FileText },
                { step: "3", title: "Validasi", desc: "Asesor dan admin memvalidasi hasil penilaian akhir.", icon: Activity },
                { step: "4", title: "Sertifikat", desc: "Sertifikat digital diterbitkan dan dapat diverifikasi publik.", icon: Award },
              ].map((item, i) => (
                <div key={i} className="relative flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-white shadow-sm border border-slate-200 text-blue-600 rounded-2xl flex items-center justify-center relative z-10">
                    <item.icon className="w-8 h-8" />
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm border-4 border-slate-50">{item.step}</div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fitur" className="py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Keunggulan Sistem</h2>
              <p className="mt-4 text-slate-600">Dirancang untuk satu pelatihan tetap dengan pengalaman yang lebih sederhana dan aman.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4"><Shield className="w-5 h-5" /></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Data Terkendali</h3>
                <p className="text-slate-600 text-sm">Verifikasi publik berjalan lewat endpoint terbatas dan pencatatan log sisi server.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4"><Award className="w-5 h-5" /></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Soulbound Token</h3>
                <p className="text-slate-600 text-sm">Sertifikat diterbitkan sebagai bukti digital yang melekat pada pemiliknya.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4"><CheckCircle className="w-5 h-5" /></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Verifikasi Publik</h3>
                <p className="text-slate-600 text-sm">Pemeriksaan sertifikat dapat dilakukan tanpa login oleh siapa pun.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4"><FileText className="w-5 h-5" /></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Satu Pelatihan Tetap</h3>
                <p className="text-slate-600 text-sm">Antarmuka lebih fokus karena sistem hanya menangani Junior Web Developer.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 font-bold tracking-tight text-white mb-4 text-xl">
            <Shield className="w-5 h-5 text-blue-400" />
            {APP_NAME}
          </div>
          <p className="text-sm text-slate-500">Fokus pelatihan: {TRAINING_NAME} • Bidang: {TRAINING_FIELD}</p>
          <p className="text-xs text-slate-600 mt-4">© {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      </footer>
    </div>
  );
}
