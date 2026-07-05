"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, startTransition } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { APP_NAME, TRAINING_FIELD, TRAINING_NAME } from "@/lib/app-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Award, ClipboardList, GraduationCap, User, Wallet } from "lucide-react";
import { getAssessmentStatusBadgeClass, getAssessmentStatusLabel } from "@/lib/status-labels";

type AssessmentRow = { id: string; status: string | null; created_at: string; };
type CertRow = { id: string; certificate_number: string | null; status: string | null; minted_at: string | null; };
type DashboardData = { assessments: AssessmentRow[]; certificates: CertRow[]; profile: { full_name: string | null; nik: string | null; wallet_address: string | null } | null; };

export default function ParticipantDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData>({ assessments: [], certificates: [], profile: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { startTransition(() => { setData({ assessments: [], certificates: [], profile: null }); setLoading(false); }); return; }
    let mounted = true;
    async function load() {
      startTransition(() => { setLoading(true); });
      try {
        const token = localStorage.getItem("ssdp_token");
        const [assessResult, profileResult, certificatesPayload] = await Promise.all([
          supabase.from("penilaian").select("id, status, created_at").eq("participant_id", user.id).order("created_at", { ascending: false }).limit(6),
          supabase.from("profil").select("full_name, nik, wallet_address").eq("id", user.id).maybeSingle(),
          token
            ? fetch("/api/participant/certificates", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
                .then(async (response) => response.ok ? await response.json() : { items: [] })
                .catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
        ]);
        if (!mounted) return;
        setData({ assessments: (assessResult.data as AssessmentRow[]) || [], certificates: (certificatesPayload.items as CertRow[]) || [], profile: profileResult.data as DashboardData["profile"] });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => { if (!mounted) return; setData({ assessments: [], certificates: [], profile: null }); setLoading(false); });
    return () => { mounted = false; };
  }, [authLoading, user]);

  const kpis = useMemo(() => [
    { label: "Total Penilaian", value: data.assessments.length, icon: ClipboardList, tone: "border-blue-100 bg-blue-50 text-blue-700", note: "Penilaian yang pernah diikuti" },
    { label: "Sertifikat Terbit", value: data.certificates.filter((c) => c.status === "minted" || c.status === "certified").length, icon: Award, tone: "border-emerald-100 bg-emerald-50 text-emerald-700", note: "Sertifikat yang sudah diterbitkan" },
  ], [data]);
  const shortWallet = (w?: string | null) => w ? `${w.slice(0, 8)}...${w.slice(-6)}` : "-";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4"><Badge className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-emerald-700 hover:bg-emerald-50">Dashboard Peserta</Badge><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{APP_NAME}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">Pantau penilaian dan sertifikat kamu untuk pelatihan <span className="font-semibold text-slate-900">{TRAINING_NAME}</span> bidang <span className="font-semibold text-slate-900">{TRAINING_FIELD}</span>.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Nama</p><div className="mt-2 flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" /><p className="truncate text-sm font-semibold text-slate-950">{data.profile?.full_name || user?.full_name || "Peserta"}</p></div><p className="mt-1 text-xs text-slate-500">NIK: {data.profile?.nik || user?.nik || "-"}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Wallet</p><div className="mt-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" /><p className="font-mono text-xs font-semibold text-slate-950">{shortWallet(data.profile?.wallet_address || user?.wallet_address)}</p></div><p className="mt-1 text-xs text-slate-500">Polygon Amoy</p></div></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {kpis.map((kpi) => { const Icon = kpi.icon; return <Card key={kpi.label} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">{kpi.label}</p><p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{loading ? "..." : kpi.value}</p><p className="mt-2 text-xs leading-6 text-slate-500">{kpi.note}</p></div><div className={`rounded-2xl border p-3 ${kpi.tone}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>; })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="border-slate-200 shadow-sm"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-xl text-slate-950">Penilaian Terbaru</CardTitle><p className="mt-1 text-sm text-slate-500">Status penilaian yang pernah kamu ikuti.</p></div><Button asChild variant="outline" className="rounded-xl border-slate-200"><Link href="/participant/assessments">Semua <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader><CardContent><div className="overflow-hidden rounded-2xl border border-slate-200"><Table><TableHeader className="bg-slate-50"><TableRow><TableHead>ID Penilaian</TableHead><TableHead>Status</TableHead><TableHead>Waktu</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={3} className="py-10 text-center text-slate-500">Memuat penilaian...</TableCell></TableRow> : data.assessments.length === 0 ? <TableRow><TableCell colSpan={3} className="py-10 text-center text-slate-500">Belum ada penilaian.</TableCell></TableRow> : data.assessments.map((row) => <TableRow key={row.id}><TableCell className="font-mono text-xs text-slate-600">{row.id.slice(0, 8)}...</TableCell><TableCell><Badge variant="outline" className={getAssessmentStatusBadgeClass(row.status)}>{getAssessmentStatusLabel(row.status)}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(row.created_at).toLocaleString("id-ID")}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
        <div className="space-y-6"><Card className="border-slate-200 shadow-sm"><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="text-lg text-slate-950">Sertifikat Saya</CardTitle><Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><Link href="/participant/certificates">Lihat semua <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button></CardHeader><CardContent className="space-y-3">{loading ? <p className="text-sm text-slate-500">Memuat sertifikat...</p> : data.certificates.length === 0 ? <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-8 text-center"><GraduationCap className="h-8 w-8 text-slate-300" /><p className="text-sm text-slate-500">Belum ada sertifikat.</p><p className="text-xs text-slate-400">Sertifikat akan muncul setelah penilaian disetujui dan diterbitkan.</p></div> : data.certificates.map((cert) => <div key={cert.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div><p className="text-sm font-semibold text-slate-900">{cert.certificate_number || "Nomor belum tersedia"}</p><p className="mt-0.5 text-xs text-slate-500">{cert.minted_at ? new Date(cert.minted_at).toLocaleDateString("id-ID") : "-"}</p></div><Badge variant="outline" className={cert.status === "minted" || cert.status === "certified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{cert.status === "minted" ? "Terbit" : cert.status === "certified" ? "Sertifikat Sudah Diterbitkan" : cert.status || "-"}</Badge></div>)}</CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg text-slate-950">Akses Cepat</CardTitle></CardHeader><CardContent className="space-y-3"><Link href="/participant/assessments" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Riwayat Penilaian <ArrowRight className="h-4 w-4" /></Link><Link href="/participant/certificates" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">Sertifikat Saya <ArrowRight className="h-4 w-4" /></Link><Link href="/verify" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">Verifikasi Sertifikat <ArrowRight className="h-4 w-4" /></Link></CardContent></Card></div>
      </section>
    </div>
  );
}
