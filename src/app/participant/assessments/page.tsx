"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList } from "lucide-react";
import { getAssessmentStatusBadgeClass, getAssessmentStatusLabel } from "@/lib/status-labels";

type Row = { id: string; status: string; recommendation: string | null; created_at: string; assessor?: { full_name: string | null } | null; };

export default function ParticipantAssessmentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) return;

      setLoading(true);
      const { data } = await supabase.from("penilaian").select(`id,status,recommendation,created_at,assessor:profil!assessor_id(full_name)`).eq("participant_id", user.id).order("created_at", { ascending: false });
      if (mounted) {
        setItems((data as unknown as Row[]) || []);
        setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-700"><ClipboardList className="h-5 w-5" /></div><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Penilaian Saya</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Pantau status penilaian yang sedang atau pernah kamu ikuti dari satu halaman yang rapi dan mudah dibaca.</p></div></div></section>
      <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-xl text-slate-950">Riwayat Penilaian</CardTitle><p className="text-sm text-slate-500">Status di bawah memakai label yang sama dengan halaman admin dan asesor agar konsisten.</p></CardHeader><CardContent><div className="overflow-hidden rounded-2xl border border-slate-200"><Table><TableHeader className="bg-slate-50"><TableRow><TableHead>ID Penilaian</TableHead><TableHead>Asesor</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead>Waktu</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Memuat penilaian...</TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Belum ada data penilaian.</TableCell></TableRow> : items.map((item) => <TableRow key={item.id}><TableCell className="font-mono text-xs text-slate-600">{item.id.slice(0, 8)}...</TableCell><TableCell className="text-sm text-slate-700">{item.assessor?.full_name || "Belum ditugaskan"}</TableCell><TableCell><Badge variant="outline" className={getAssessmentStatusBadgeClass(item.status)}>{getAssessmentStatusLabel(item.status)}</Badge></TableCell><TableCell className="max-w-[320px] text-sm text-slate-600">{item.recommendation || "Belum ada catatan hasil"}</TableCell><TableCell className="whitespace-nowrap text-xs text-slate-500">{new Date(item.created_at).toLocaleString("id-ID")}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    </div>
  );
}
