"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { APP_NAME, TRAINING_NAME } from "@/lib/app-config";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, CheckCircle2, ClipboardList, Clock, FileCheck, ShieldCheck } from "lucide-react";
import { getAssessmentStatusBadgeClass, getAssessmentStatusLabel } from "@/lib/status-labels";

type PenilaianRow = { id: string; status: string | null; created_at: string; participant?: { full_name?: string | null; email?: string | null } | null; };
type DashboardData = { totalAssigned: number; pending: number; inProgress: number; evaluated: number; approved: number; recent: PenilaianRow[]; };
const initialData: DashboardData = { totalAssigned: 0, pending: 0, inProgress: 0, evaluated: 0, approved: 0, recent: [] };

export default function AssessorDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.id) { if (mounted) { setData(initialData); setLoading(false); } return; }
      try {
        const { data: rows } = await supabase.from("penilaian").select("id, status, created_at, participant:profil!participant_id(full_name, email)").eq("assessor_id", user.id).order("created_at", { ascending: false }).limit(50);
        if (!mounted) return;
        const all = (rows as PenilaianRow[]) || [];
        const recent = all.slice(0, 8);
        setData({ totalAssigned: all.length, pending: all.filter((r) => r.status === "pending").length, inProgress: all.filter((r) => r.status === "in_progress").length, evaluated: all.filter((r) => r.status === "evaluated").length, approved: all.filter((r) => r.status === "approved" || r.status === "certified").length, recent });
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const kpis = useMemo(() => [
    { label: "Total Ditugaskan", value: data.totalAssigned, icon: ClipboardList, tone: "border-slate-200 bg-slate-50 text-slate-700", note: "Semua penilaian yang menjadi tanggung jawab kamu" },
    { label: "Sedang Dinilai", value: data.inProgress, icon: Clock, tone: "border-blue-100 bg-blue-50 text-blue-700", note: "Masih aktif diproses" },
    { label: "Sudah Dinilai", value: data.evaluated, icon: FileCheck, tone: "border-violet-100 bg-violet-50 text-violet-700", note: "Sudah punya hasil evaluasi" },
    { label: "Lulus / Terbit", value: data.approved, icon: CheckCircle2, tone: "border-emerald-100 bg-emerald-50 text-emerald-700", note: "Lulus atau sudah diterbitkan" },
  ], [data]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <Badge className="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-indigo-700 hover:bg-indigo-50">Dashboard Asesor</Badge>
            <div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{APP_NAME}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">Pantau penilaian peserta yang sudah ditugaskan ke akun kamu untuk pelatihan <span className="font-semibold text-slate-900">{TRAINING_NAME}</span>.</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Peran</p><div className="mt-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-600" /><p className="text-sm font-semibold text-slate-950">Asesor</p></div><p className="mt-1 text-xs text-slate-500">{user?.full_name || user?.email || "Pengguna asesor"}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Ringkasan</p><p className="mt-2 text-sm font-semibold text-slate-950">{loading ? "Memuat..." : `${data.totalAssigned} penilaian masuk ke akun kamu`}</p><p className="mt-1 text-xs leading-6 text-slate-500">Fokus utama ada di penilaian aktif dan penilaian yang sudah selesai dinilai.</p></div></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => { const Icon = kpi.icon; return <Card key={kpi.label} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">{kpi.label}</p><p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{loading ? "..." : kpi.value}</p><p className="mt-2 text-xs leading-6 text-slate-500">{kpi.note}</p></div><div className={`rounded-2xl border p-3 ${kpi.tone}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>; })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-xl text-slate-950">Penilaian Terbaru</CardTitle><p className="mt-1 text-sm text-slate-500">Daftar penilaian terbaru yang saat ini ditugaskan ke akun kamu.</p></div><Button asChild variant="outline" className="rounded-xl border-slate-200"><Link href="/assessor/evaluations">Semua penilaian <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader>
          <CardContent>{loading ? <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-slate-500">Memuat data penilaian...</div> : data.recent.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center"><p className="text-sm font-semibold text-slate-900">Belum ada penilaian masuk</p><p className="mt-2 text-sm leading-6 text-slate-500">Begitu admin menugaskan penilaian ke akun kamu, daftar terbaru akan tampil di sini.</p></div> : <div className="overflow-hidden rounded-2xl border border-slate-200"><Table><TableHeader className="bg-slate-50"><TableRow><TableHead>Peserta</TableHead><TableHead>Status</TableHead><TableHead>Waktu</TableHead></TableRow></TableHeader><TableBody>{data.recent.map((item) => <TableRow key={item.id}><TableCell><p className="font-semibold text-slate-900">{item.participant?.full_name || "Peserta"}</p><p className="text-xs text-slate-400">{item.participant?.email || "-"}</p></TableCell><TableCell><Badge variant="outline" className={getAssessmentStatusBadgeClass(item.status)}>{getAssessmentStatusLabel(item.status)}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(item.created_at).toLocaleString("id-ID")}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-xl text-slate-950">Panduan Singkat</CardTitle><p className="mt-1 text-sm text-slate-500">Alur kerja asesor tetap sama, hanya tampilannya yang dirapikan.</p></CardHeader><CardContent className="space-y-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-950">1. Terima penugasan</p><p className="mt-1 text-xs leading-6 text-slate-500">Admin menugaskan penilaian ke akun asesor.</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-950">2. Nilai peserta</p><p className="mt-1 text-xs leading-6 text-slate-500">Ubah hasil sesuai evaluasi dari halaman detail penilaian.</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-950">3. Lanjut ke admin</p><p className="mt-1 text-xs leading-6 text-slate-500">Jika peserta lulus, admin melanjutkan ke tahap penerbitan sertifikat.</p></div><Button asChild className="w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"><Link href="/assessor/evaluations">Buka Penilaian Aktif <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>
      </section>
    </div>
  );
}
