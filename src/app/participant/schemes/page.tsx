"use client";
import { useEffect, useState, startTransition } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { APP_NAME, TRAINING_FIELD, TRAINING_NAME } from "@/lib/app-config";
import { Award, BookOpen, CheckCircle2, ClipboardList, GraduationCap, Layers, Loader2, ShieldCheck, Wallet } from "lucide-react";

const COMPETENCIES = [
  "Membuat struktur halaman web menggunakan HTML5 semantik",
  "Menerapkan styling responsif menggunakan CSS3 dan Flexbox/Grid",
  "Mengimplementasikan interaksi dinamis menggunakan JavaScript ES6+",
  "Menggunakan framework/library front-end (React, Vue, atau sejenisnya)",
  "Melakukan pengujian dan debugging aplikasi web",
  "Menerapkan praktik keamanan dasar pada aplikasi web",
];

export default function ParticipantTrainingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<{ status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      startTransition(() => {
        setExisting(null);
        setLoading(false);
      });
      return;
    }

    startTransition(() => {
      setLoading(true);
    });
    supabase
      .from("penilaian")
      .select("status")
      .eq("participant_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setExisting(data);
        setLoading(false);
      }, () => {
        setExisting(null);
        setLoading(false);
      });
  }, [authLoading, user]);

  const handleRegister = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("penilaian").insert({ participant_id: user.id, training_name: TRAINING_NAME, training_field: TRAINING_FIELD, status: "pending" });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Pendaftaran penilaian berhasil dikirim. Tunggu penugasan asesor.");
    setExisting({ status: "pending" });
  };

  const statusLabel = (s: string) => ({ pending: "Menunggu Asesor", in_progress: "Sedang Dinilai", evaluated: "Sudah Dievaluasi", approved: "Disetujui", certified: "Tersertifikasi", rejected: "Ditolak" }[s] || s);
  const statusClass = (s: string) => {
    if (s === "approved" || s === "certified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (s === "rejected") return "border-red-200 bg-red-50 text-red-700";
    if (s === "in_progress" || s === "evaluated") return "border-blue-200 bg-blue-50 text-blue-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_55%,_#ecfdf5_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-emerald-700 hover:bg-white/80">
              Pelatihan Aktif
            </Badge>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{TRAINING_NAME}</h1>
            <p className="text-sm text-slate-500">Bidang: <span className="font-semibold text-slate-700">{TRAINING_FIELD}</span> &bull; Penerbit: <span className="font-semibold text-slate-700">{APP_NAME}</span></p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700">
            <GraduationCap className="h-7 w-7" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"><BookOpen className="h-5 w-5 text-emerald-600" /> Informasi Pelatihan</h2>
            <p className="text-sm leading-7 text-slate-600">
              Pelatihan ini <span className="font-semibold">{TRAINING_NAME}</span> dirancang untuk memvalidasi kompetensi peserta dalam bidang pengembangan web front-end. Sertifikat diterbitkan sebagai <span className="font-semibold">Soulbound Token (SBT)</span> di jaringan <span className="font-semibold">Polygon Amoy Testnet</span>, bersifat non-transferable, dan dapat diverifikasi publik.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { icon: Layers, label: "Jenis Token", val: "Soulbound Token (SBT)" },
                { icon: Wallet, label: "Jaringan", val: "Polygon Amoy (Chain ID 80002)" },
                { icon: ShieldCheck, label: "Verifikasi", val: "Portal publik tanpa login" },
                { icon: Award, label: "Format", val: "NFT non-transferable" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"><ClipboardList className="h-5 w-5 text-emerald-600" /> Unit Kompetensi</h2>
            <ul className="space-y-2">
              {COMPETENCIES.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-700">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Status Pendaftaran</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Memuat status...</div>
            ) : existing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status Penilaian</p>
                    <Badge variant="outline" className={`mt-2 ${statusClass(existing.status)}`}>{statusLabel(existing.status)}</Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Kamu sudah mendaftar penilaian untuk pelatihan ini. Pantau status di halaman <span className="font-semibold">Penilaian Saya</span>.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Kamu belum mendaftar penilaian untuk pelatihan ini. Klik tombol di bawah untuk mendaftar.</p>
                <Button onClick={handleRegister} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendaftar...</> : <><GraduationCap className="mr-2 h-4 w-4" /> Daftar Pelatihan</>}
                </Button>
                <p className="text-xs text-slate-400">Setelah mendaftar, sistem akan menugaskan asesor untuk mengevaluasi kompetensi kamu.</p>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-slate-900">Alur Sertifikasi</h2>
            <div className="space-y-2">
              {["Peserta mendaftar penilaian", "Asesor melakukan evaluasi kompetensi", "Admin menyetujui hasil penilaian", "Sertifikat SBT diterbitkan ke wallet peserta", "Verifikasi publik tersedia di portal"].map((step, i) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{i + 1}</div>
                  <p className="text-xs leading-5 text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


