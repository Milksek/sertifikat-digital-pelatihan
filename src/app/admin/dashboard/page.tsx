"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME, TRAINING_NAME } from "@/lib/app-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity,
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  ShieldCheck,
  Users,
} from "lucide-react";

type DashboardMetricState = {
  totalParticipants: number;
  totalAssessors: number;
  totalAssessments: number;
  totalCertificates: number;
  totalVerifications: number;
  approvedAssessments: number;
  certifiedAssessments: number;
  recentLogs: Array<{
    id: string;
    action: string | null;
    details: string | null;
    created_at: string;
    profil?: {
      full_name?: string | null;
      email?: string | null;
    } | null;
  }>;
};

const initialState: DashboardMetricState = {
  totalParticipants: 0,
  totalAssessors: 0,
  totalAssessments: 0,
  totalCertificates: 0,
  totalVerifications: 0,
  approvedAssessments: 0,
  certifiedAssessments: 0,
  recentLogs: [],
};

const actionLabel = (action?: string | null) => {
  switch (action) {
    case "mint_certificate": return "Mint Sertifikat";
    case "pencabutan_sertifikat": return "Pencabutan Sertifikat";
    case "assign_assessor": return "Penugasan Asesor";
    case "tambah_asesor": return "Tambah Asesor";
    case "penilaian_disetujui": return "Penilaian Disetujui";
    case "penilaian_ditolak": return "Penilaian Ditolak";
    default: return action || "Aktivitas Sistem";
  }
};

const actionBadgeClass = (action?: string | null) => {
  switch (action) {
    case "mint_certificate": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "penilaian_disetujui": return "border-blue-200 bg-blue-50 text-blue-700";
    case "penilaian_ditolak": return "border-amber-200 bg-amber-50 text-amber-700";
    case "pencabutan_sertifikat": return "border-red-200 bg-red-50 text-red-700";
    case "assign_assessor": return "border-blue-200 bg-blue-50 text-blue-700";
    case "tambah_asesor": return "border-indigo-200 bg-indigo-50 text-indigo-700";
    default: return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

function formatDetail(details: string | null) {
  if (!details) return <span className="text-slate-400">Tanpa detail tambahan</span>;
  try {
    const p = typeof details === "string" ? JSON.parse(details) : details;
    if (p.certificate_number) return (
      <div className="space-y-0.5">
        <p>Sertifikat <span className="font-mono font-semibold text-slate-800">{p.certificate_number}</span></p>
        {p.participant_wallet && <p className="font-mono text-xs text-slate-500">{p.participant_wallet.slice(0,6)}...{p.participant_wallet.slice(-4)}</p>}
        {p.token_id !== undefined && <p className="text-emerald-700 font-semibold">Token #{p.token_id}</p>}
      </div>
    );
    return <span>{details}</span>;
  } catch {
    return <span>{details}</span>;
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardMetricState>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("ssdp_token");
        const response = await fetch("/api/admin/dashboard-summary", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result) throw new Error(result?.error || "Gagal memuat dashboard admin.");
        if (!mounted) return;
        setData({
          totalParticipants: result.totalParticipants ?? 0,
          totalAssessors: result.totalAssessors ?? 0,
          totalAssessments: result.totalAssessments ?? 0,
          totalCertificates: result.totalCertificates ?? 0,
          totalVerifications: result.totalVerifications ?? 0,
          approvedAssessments: result.approvedAssessments ?? 0,
          certifiedAssessments: result.certifiedAssessments ?? 0,
          recentLogs: result.recentLogs || [],
        });
      } catch (error) {
        console.error("Gagal memuat dashboard admin:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDashboard();
    return () => { mounted = false; };
  }, []);

  const summaryCards = useMemo(() => [
    { title: "Peserta", value: data.totalParticipants, note: "Total akun peserta terdaftar", icon: Users, tone: "border-blue-100 bg-blue-50 text-blue-700" },
    { title: "Asesor", value: data.totalAssessors, note: "Pengguna yang berwenang menilai", icon: ShieldCheck, tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
    { title: "Penilaian", value: data.totalAssessments, note: "Data penilaian yang tercatat", icon: FileCheck, tone: "border-amber-100 bg-amber-50 text-amber-700" },
    { title: "Sertifikat", value: data.totalCertificates, note: "Sertifikat yang masuk modul penerbitan", icon: Award, tone: "border-violet-100 bg-violet-50 text-violet-700" },
  ], [data]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <Badge className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-blue-700 hover:bg-blue-50">Dashboard Admin</Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{APP_NAME}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">Ringkasan operasional admin untuk pengelolaan peserta, penilaian, penerbitan sertifikat, dan aktivitas terbaru pada pelatihan <span className="font-semibold text-slate-900">{TRAINING_NAME}</span>.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Peran</p><p className="mt-2 text-sm font-semibold text-slate-950">Administrator</p><p className="mt-1 text-xs text-slate-500">Kontrol utama sistem</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pelatihan</p><p className="mt-2 text-sm font-semibold text-slate-950">{TRAINING_NAME}</p><p className="mt-1 text-xs text-slate-500">Pelatihan tetap sistem</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mode</p><p className="mt-2 text-sm font-semibold text-slate-950">Monitoring Aktif</p><p className="mt-1 text-xs text-slate-500">Pantau data dan progres</p></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return <Card key={card.title} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">{card.title}</p><p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{loading ? "..." : card.value}</p><p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p></div><div className={`rounded-2xl border p-3 ${card.tone}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>;
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle className="text-xl text-slate-950">Aktivitas Terbaru</CardTitle><p className="mt-1 text-sm text-slate-500">Log terbaru dari aksi penting admin dan sistem.</p></div>
            <Button asChild variant="outline" className="rounded-xl border-slate-200"><Link href="/admin/logs">Lihat semua <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50"><TableRow><TableHead>Waktu</TableHead><TableHead>Pengguna</TableHead><TableHead>Aksi</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">Memuat aktivitas terbaru...</TableCell></TableRow> : data.recentLogs.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">Belum ada aktivitas yang tercatat.</TableCell></TableRow> : data.recentLogs.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(log.created_at).toLocaleString("id-ID")}</TableCell><TableCell><div><p className="font-medium text-slate-900">{log.profil?.full_name || "Sistem"}</p><p className="text-xs text-slate-400">{log.profil?.email || "-"}</p></div></TableCell><TableCell><Badge variant="outline" className={actionBadgeClass(log.action)}>{actionLabel(log.action)}</Badge></TableCell><TableCell className="max-w-md text-sm text-slate-600">{formatDetail(log.details)}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg text-slate-950">Ringkasan Operasional</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ClipboardList className="h-4 w-4 text-blue-600" /> Penilaian siap diproses</div><p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? "..." : data.approvedAssessments}</p><p className="mt-1 text-xs leading-6 text-slate-500">Penilaian yang siap lanjut ke tahap penerbitan sertifikat.</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Sertifikat sudah diterbitkan</div><p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? "..." : data.certifiedAssessments}</p><p className="mt-1 text-xs leading-6 text-slate-500">Jumlah peserta yang sudah masuk status sertifikat diterbitkan.</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity className="h-4 w-4 text-amber-600" /> Verifikasi publik</div><p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? "..." : data.totalVerifications}</p><p className="mt-1 text-xs leading-6 text-slate-500">Total log verifikasi yang masuk dari portal publik.</p></div></CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg text-slate-950">Akses Cepat</CardTitle></CardHeader><CardContent className="space-y-3"><Link href="/admin/assessments" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Data Penilaian</Link><Link href="/admin/mint" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Penerbitan Sertifikat</Link><Link href="/verify" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Portal Verifikasi Publik</Link></CardContent></Card>
        </div>
      </section>
    </div>
  );
}
