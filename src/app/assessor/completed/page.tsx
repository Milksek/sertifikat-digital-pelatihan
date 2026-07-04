"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { TRAINING_NAME } from "@/lib/app-config";

type Row = { id: string; status: string; recommendation: string | null; training_name: string; updated_at: string; participant?: { full_name: string | null } | null; };

const statusLabel = (s: string) => ({ evaluated: "Dievaluasi", approved: "Disetujui", rejected: "Ditolak", certified: "Tersertifikasi" }[s] || s);
const statusClass = (s: string) => {
  if (s === "approved" || s === "certified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
};

export default function AssessorCompletedPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("penilaian").select(`id,status,recommendation,training_name,updated_at,participant:profil!participant_id(full_name)`).in("status", ["evaluated", "approved", "rejected", "certified"]).order("updated_at", { ascending: false }).then(({ data }) => { setItems((data as Row[]) || []); setLoading(false); });
  }, []);

  const filtered = items.filter((i) => !search || i.participant?.full_name?.toLowerCase().includes(search.toLowerCase()));
  const approved = items.filter((i) => i.status === "approved" || i.status === "certified").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Riwayat Penilaian</h1>
        <p className="mt-1 text-sm text-slate-500">Pelatihan <span className="font-semibold">{TRAINING_NAME}</span> dan daftar penilaian yang telah selesai dievaluasi.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold text-emerald-700">Disetujui</p><p className="text-3xl font-black text-slate-900">{loading ? "..." : approved}</p></div>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-red-50/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl border border-red-200 bg-red-100 p-3 text-red-700"><XCircle className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold text-red-700">Ditolak</p><p className="text-3xl font-black text-slate-900">{loading ? "..." : rejected}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl text-slate-900">Semua Riwayat</CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari peserta..." className="pl-9 h-9 rounded-xl border-slate-200" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Peserta</TableHead>
                  <TableHead>Pelatihan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rekomendasi</TableHead>
                  <TableHead>Selesai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Memuat data...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Belum ada riwayat penilaian.</TableCell></TableRow>
                ) : filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-slate-900">{item.participant?.full_name || "Peserta"}</TableCell>
                    <TableCell className="text-sm text-slate-700">{item.training_name}</TableCell>
                    <TableCell><Badge variant="outline" className={statusClass(item.status)}>{statusLabel(item.status)}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-600">{item.recommendation || "Belum ada catatan hasil evaluasi"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(item.updated_at).toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

