"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { getAssessmentStatusBadgeClass, getAssessmentStatusLabel } from "@/lib/status-labels";

type AssessmentDetail = { id: string; status: string; recommendation: string | null; participant?: { full_name: string | null; wallet_address: string; email?: string | null; nik?: string | null } | null; };
const initialsFromName = (name?: string | null) => { if (!name) return "PS"; const parts = name.trim().split(/\s+/).filter(Boolean); return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "PS"; };

export default function AssessorEvaluateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params?.id || !user?.id || typeof window === "undefined") return;

    const token = localStorage.getItem("ssdp_token");
    if (!token) return;

    fetch(`/api/assessor/assessments/${params.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat detail penilaian.");
        setAssessment((result.assessment as AssessmentDetail) || null);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Gagal memuat detail penilaian.";
        toast.error(message);
      });
  }, [params?.id, user?.id]);

  const updateStatus = async (status: string) => {
    if (!assessment || isLocked) return;
    setSaving(true);
    const { error } = await supabase
      .from("penilaian")
      .update({ status, recommendation: assessment.recommendation })
      .eq("id", assessment.id)
      .eq("assessor_id", user?.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setAssessment({ ...assessment, status });
    toast.success("Status penilaian diperbarui.");
    router.push("/assessor/evaluations");
  };

  const saveRecommendation = async () => {
    if (!assessment || isLocked) return;
    setSaving(true);
    const { error } = await supabase
      .from("penilaian")
      .update({ recommendation: assessment.recommendation })
      .eq("id", assessment.id)
      .eq("assessor_id", user?.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Catatan asesor disimpan.");
  };

  if (!assessment) {
    return <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center"><p className="text-base font-semibold text-slate-900">Data penilaian belum tersedia</p><p className="mt-2 text-sm leading-6 text-slate-500">Penilaian ini belum ditugaskan ke akun kamu atau datanya sudah tidak bisa diakses.</p></div>;
  }

  const isLocked = ["approved", "rejected", "certified"].includes(assessment.status);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">{initialsFromName(assessment.participant?.full_name)}</div><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Detail Penilaian</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{assessment.participant?.full_name || "Peserta belum terdaftar"}</h1><p className="mt-2 text-sm leading-6 text-slate-600">Tinjau data peserta lalu ambil keputusan akhir penilaian dari halaman yang sederhana dan mudah dibaca.</p></div></div>
          <div className="flex flex-wrap gap-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p><div className="mt-2"><Badge variant="outline" className={getAssessmentStatusBadgeClass(assessment.status)}>{getAssessmentStatusLabel(assessment.status)}</Badge></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">ID Penilaian</p><p className="mt-2 text-sm font-semibold text-slate-900">#{assessment.id.slice(0, 8)}</p></div></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Informasi Peserta</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Profil Utama</h2></div><div className="grid gap-4 px-6 py-5 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:col-span-2"><p className="text-sm font-medium text-slate-500">Nama Peserta</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{assessment.participant?.full_name || "Belum tersedia"}</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-4"><p className="text-sm font-medium text-slate-500">Email</p><p className="mt-2 text-sm font-semibold text-slate-950">{assessment.participant?.email || "Belum tersedia"}</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-4"><p className="text-sm font-medium text-slate-500">NIK</p><p className="mt-2 text-sm font-semibold text-slate-950">{assessment.participant?.nik || "Belum tersedia"}</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 md:col-span-2"><p className="text-sm font-medium text-slate-500">Wallet Address</p><p className="mt-2 break-all text-sm font-semibold leading-6 text-slate-950">{assessment.participant?.wallet_address || "Belum tersedia"}</p></div></div></div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ringkasan Penilaian</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Status dan Catatan</h2></div><div className="grid gap-4 px-6 py-5 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-sm font-medium text-slate-500">Status Saat Ini</p><div className="mt-3"><Badge variant="outline" className={getAssessmentStatusBadgeClass(assessment.status)}>{getAssessmentStatusLabel(assessment.status)}</Badge></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-sm font-medium text-slate-500">Program</p><p className="mt-3 text-sm font-semibold text-slate-950">Junior Web Developer</p></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 md:col-span-2"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500">Catatan / Rekomendasi</p><Button type="button" variant="outline" className="rounded-xl" disabled={saving || isLocked} onClick={saveRecommendation}>{isLocked ? "Terkunci" : "Simpan Catatan"}</Button></div><Textarea value={assessment.recommendation || ""} onChange={(event) => setAssessment({ ...assessment, recommendation: event.target.value })} placeholder="Tulis catatan hasil evaluasi, kekuatan peserta, atau alasan keputusan akhir di sini." className="mt-3 min-h-[140px] resize-y border-slate-200 bg-slate-50 text-sm leading-6 text-slate-700 disabled:opacity-100" disabled={isLocked} /></div></div></div>
        </section>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Aksi Penilaian</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Keputusan Asesor</h2><p className="mt-2 text-sm leading-6 text-slate-600">{isLocked ? "Penilaian final sudah dikunci. Halaman ini hanya untuk preview hasil akhir." : "Pilih status sesuai hasil evaluasi peserta."}</p></div><div className="space-y-4 px-6 py-5"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-sm font-medium text-slate-500">Status Saat Ini</p><div className="mt-3"><Badge variant="outline" className={getAssessmentStatusBadgeClass(assessment.status)}>{getAssessmentStatusLabel(assessment.status)}</Badge></div></div><div className="grid gap-3"><Button disabled={saving || isLocked} onClick={() => updateStatus("approved")} className="h-12 justify-between rounded-2xl bg-emerald-600 px-4 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"><span className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4" /><span className="text-sm font-semibold">Setujui Peserta</span></span><span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-50">Pass</span></Button><Button disabled={saving || isLocked} onClick={() => updateStatus("rejected")} variant="destructive" className="h-12 justify-between rounded-2xl px-4 disabled:cursor-not-allowed disabled:opacity-60"><span className="flex items-center gap-3"><ShieldAlert className="h-4 w-4" /><span className="text-sm font-semibold">Tolak / Belum Kompeten</span></span><span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-50">Fail</span></Button></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-sm font-medium text-slate-500">Panduan Singkat</p><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><li>• Gunakan status sudah dinilai jika review selesai tapi keputusan final belum ditutup.</li><li>• Setujui peserta jika hasil penilaian dinyatakan kompeten.</li><li>• Tolak peserta jika hasil evaluasi menunjukkan belum kompeten.</li></ul></div></div></div>
        </aside>
      </div>
    </div>
  );
}
