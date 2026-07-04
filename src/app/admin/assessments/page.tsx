"use client";
import { useEffect, useState, startTransition } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, FileCheck, UserPlus } from "lucide-react";
import { TRAINING_NAME, TRAINING_FIELD } from "@/lib/app-config";
import { toast } from "sonner";
import { getAssessmentStatusBadgeClass, getAssessmentStatusLabel } from "@/lib/status-labels";

type Row = {
  id: string;
  status: string;
  recommendation: string | null;
  created_at: string;
  training_name: string;
  participant?: { full_name: string | null; wallet_address: string } | null;
  assessor?: { full_name: string | null } | null;
};
type AssessorOption = { id: string; full_name: string | null; email?: string | null; };
const ALL_STATUSES = ["pending", "in_progress", "evaluated", "approved", "certified", "rejected"];

export default function AdminAssessmentsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [assessors, setAssessors] = useState<AssessorOption[]>([]);
  const [selectedAssessors, setSelectedAssessors] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    const [assessmentRes, assessorRes] = await Promise.all([
      supabase.from("penilaian").select(`id,status,recommendation,created_at,training_name,participant:profil!participant_id(full_name,wallet_address),assessor:profil!assessor_id(full_name)`).order("created_at", { ascending: false }),
      supabase.from("profil").select("id,full_name,email").eq("role", "assessor").order("full_name", { ascending: true }),
    ]);
    setItems((assessmentRes.data as Row[]) || []);
    setAssessors((assessorRes.data as AssessorOption[]) || []);
    setLoading(false);
  };

  useEffect(() => { startTransition(() => { load(); }); }, []);

  const filtered = items.filter((i) => {
    const matchSearch = !search || i.participant?.full_name?.toLowerCase().includes(search.toLowerCase()) || i.assessor?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts: Record<string, number> = {};
  items.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1; });

  const assignAssessor = async (assessmentId: string) => {
    const assessorId = selectedAssessors[assessmentId];
    if (!assessorId) return toast.error("Pilih asesor dulu.");
    const authToken = typeof window === "undefined" ? null : localStorage.getItem("ssdp_token");
    if (!authToken) return toast.error("Token login admin tidak ditemukan.");
    setAssigningId(assessmentId);
    const res = await fetch(`/api/admin/assessments/${assessmentId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ assessor_id: assessorId }),
    });
    const payload = await res.json().catch(() => ({}));
    setAssigningId(null);
    if (!res.ok) return toast.error(payload.error || "Gagal assign asesor.");
    toast.success("Asesor berhasil ditugaskan.");
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Data Penilaian</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Semua penilaian untuk pelatihan <span className="font-semibold text-slate-900">{TRAINING_NAME}</span> bidang <span className="font-semibold text-slate-900">{TRAINING_FIELD}</span>. Admin bisa memantau status dan menugaskan asesor dari halaman ini.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl border-slate-200"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle className="flex items-center gap-2 text-xl text-slate-950"><FileCheck className="h-5 w-5 text-blue-600" /> Daftar Penilaian</CardTitle><p className="mt-1 text-sm text-slate-500">Cari peserta atau asesor lalu pantau status penilaian dari satu tabel yang rapi.</p></div>
            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari peserta/asesor..." className="h-10 rounded-xl border-slate-200 pl-9" /></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterStatus("all")} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${filterStatus === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>Semua ({items.length})</button>
              {ALL_STATUSES.map((s) => <button key={s} onClick={() => setFilterStatus(s)} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${filterStatus === s ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>{getAssessmentStatusLabel(s)} ({counts[s] || 0})</button>)}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50"><TableRow><TableHead>Peserta</TableHead><TableHead>Asesor</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">Memuat data penilaian...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">Tidak ada penilaian yang cocok dengan filter saat ini.</TableCell></TableRow> : filtered.map((item) => <TableRow key={item.id}><TableCell><p className="font-semibold text-slate-900">{item.participant?.full_name || "Nama peserta belum tersedia"}</p><p className="font-mono text-[11px] text-slate-400">{item.participant?.wallet_address ? `${item.participant.wallet_address.slice(0, 10)}...` : ""}</p></TableCell><TableCell className="text-sm text-slate-700">{item.status === "pending" ? <div className="min-w-[220px]"><Select value={selectedAssessors[item.id] || ""} onValueChange={(value) => setSelectedAssessors((prev) => ({ ...prev, [item.id]: value }))}><SelectTrigger className="w-full border-slate-200 bg-white"><SelectValue placeholder="Pilih asesor" /></SelectTrigger><SelectContent>{assessors.map((assessor) => <SelectItem key={assessor.id} value={assessor.id}>{assessor.full_name || assessor.email || assessor.id}</SelectItem>)}</SelectContent></Select></div> : item.assessor?.full_name || <span className="italic text-slate-400">Belum ditugaskan</span>}</TableCell><TableCell><Badge variant="outline" className={getAssessmentStatusBadgeClass(item.status)}>{getAssessmentStatusLabel(item.status)}</Badge></TableCell><TableCell className="max-w-[260px] text-sm text-slate-600">{item.recommendation || "Belum ada catatan asesor"}</TableCell><TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(item.created_at).toLocaleString("id-ID")}</TableCell><TableCell>{item.status === "pending" ? <Button size="sm" className="rounded-xl bg-blue-600 text-white hover:bg-blue-700" disabled={assigningId === item.id} onClick={() => assignAssessor(item.id)}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign Asesor</Button> : <span className="text-xs text-slate-400">Sudah diproses</span>}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg text-slate-950">Ringkasan Halaman</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-7 text-slate-600"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">Penilaian berstatus <span className="font-semibold text-slate-900">Menunggu Penugasan Asesor</span> bisa langsung dipasangkan ke akun asesor dari tabel.</div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">Setelah asesor ditugaskan, alur penilaian tetap berjalan seperti semula tanpa perubahan logic backend.</div></CardContent></Card>
      </section>
    </div>
  );
}
