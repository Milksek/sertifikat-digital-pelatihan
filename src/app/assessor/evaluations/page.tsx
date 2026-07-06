"use client";
import Link from "next/link";
import { useEffect, useState, startTransition, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { TRAINING_NAME } from "@/lib/app-config";
import { getAssessmentStatusBadgeClass, getAssessmentStatusLabel } from "@/lib/status-labels";

type Row = { id: string; status: string; created_at: string; training_name: string; participant?: { full_name: string | null; email: string | null } | null; };

export default function AssessorEvaluationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("penilaian").select(`id,status,created_at,training_name,participant:profil!participant_id(full_name,email)`).eq("assessor_id", user.id).in("status", ["in_progress", "evaluated", "approved", "rejected"]).order("created_at", { ascending: true });
    setItems((data as unknown as Row[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { startTransition(() => { load(); }); }, [load]);
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const evaluated = items.filter((i) => i.status === "evaluated").length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Penilaian Aktif</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Daftar penilaian yang memang ditugaskan ke akun asesor ini untuk pelatihan <span className="font-semibold text-slate-900">{TRAINING_NAME}</span>.</p></div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl border-slate-200"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-700"><Clock className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-500">Sedang Dinilai</p><p className="text-3xl font-semibold text-slate-950">{loading ? "..." : inProgress}</p></div></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-700"><ClipboardList className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-500">Sudah Dinilai</p><p className="text-3xl font-semibold text-slate-950">{loading ? "..." : evaluated}</p></div></CardContent></Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-xl text-slate-950">Daftar Penilaian</CardTitle><p className="text-sm text-slate-500">Gunakan halaman ini untuk membuka detail penilaian yang sedang aktif ditangani.</p></CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Peserta</TableHead><TableHead>Pelatihan</TableHead><TableHead>Status</TableHead><TableHead>Masuk</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Memuat data penilaian...</TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Belum ada penilaian yang ditugaskan ke akun kamu.</TableCell></TableRow> : items.map((item) => <TableRow key={item.id}><TableCell><p className="font-semibold text-slate-900">{item.participant?.full_name || "Peserta"}</p><p className="text-xs text-slate-400">{item.participant?.email || "-"}</p></TableCell><TableCell className="text-sm text-slate-700">{item.training_name}</TableCell><TableCell><Badge variant="outline" className={getAssessmentStatusBadgeClass(item.status)}>{getAssessmentStatusLabel(item.status)}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(item.created_at).toLocaleString("id-ID")}</TableCell><TableCell><Button asChild size="sm" className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><Link href={`/assessor/evaluate/${item.id}`}>Buka Detail <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
