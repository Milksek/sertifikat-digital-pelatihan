"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, ExternalLink, FileCheck, Hammer, Loader2, ShieldCheck, Eye } from "lucide-react";
import { CERTIFICATE_ISSUER, CERTIFICATE_TITLE, TRAINING_FIELD, TRAINING_NAME } from "@/lib/app-config";
import { getAssessmentStatusBadgeClass, getAssessmentStatusLabel } from "@/lib/status-labels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type AssessmentRow = { id: string; status: string; recommendation: string | null; created_at: string; participant?: { full_name: string | null; wallet_address: string } | null; };
type MintResult = { certificate_number: string; token_id: string; tx_hash: string; metadata_url: string | null; };
const contractAddress = process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS || "";

export default function AdminMintPage() {
  const [items, setItems] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("penilaian").select(`id,status,recommendation,created_at,participant:profil!participant_id(full_name,wallet_address)`).in("status", ["approved", "certified"]).order("created_at", { ascending: false });
    setItems((data as unknown as AssessmentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);
  const ready = useMemo(() => items.filter((item) => item.status === "approved").length, [items]);
  const minted = useMemo(() => items.filter((item) => item.status === "certified").length, [items]);
  const contractReady = /^0x[a-fA-F0-9]{40}$/.test(contractAddress);

  const handleMint = async (assessmentId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ssdp_token") : null;
    if (!token) return setMessage({ type: "error", text: "Sesi admin tidak ditemukan. Login ulang dulu." });
    setMessage(null);
    setMintingId(assessmentId);
    try {
      const response = await fetch("/api/admin/mint", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ assessmentId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Mint sertifikat gagal.");
      const cert = result.certificate as MintResult;
      setMessage({ type: "success", text: `Mint berhasil untuk ${cert.certificate_number} · Token ID ${cert.token_id}` });
      await loadItems();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Mint sertifikat gagal.";
      setMessage({ type: "error", text });
    } finally {
      setMintingId(null);
    }
  };

  const handlePreview = async (assessmentId: string, participantName: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ssdp_token") : null;
    if (!token) return setMessage({ type: "error", text: "Sesi admin tidak ditemukan. Login ulang dulu." });

    setLoadingPreviewId(assessmentId);
    try {
      const response = await fetch(`/api/admin/preview-certificate?assessmentId=${assessmentId}&t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result?.error || "Gagal memuat preview gambar.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewName(participantName);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Gagal memuat preview gambar.";
      toast.error(text);
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewName(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-blue-700 hover:bg-blue-50">Penerbitan Sertifikat</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Mint Sertifikat Digital</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Tahap akhir penerbitan sertifikat untuk pelatihan <span className="font-semibold text-slate-900">{TRAINING_NAME}</span>. Halaman ini hanya menampilkan penilaian yang siap diterbitkan atau sudah diterbitkan.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:w-[360px]"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Informasi Sertifikat</p><div className="mt-3 space-y-2 text-sm text-slate-600"><p><span className="font-semibold text-slate-900">Judul:</span> {CERTIFICATE_TITLE}</p><p><span className="font-semibold text-slate-900">Bidang:</span> {TRAINING_FIELD}</p><p><span className="font-semibold text-slate-900">Penerbit:</span> {CERTIFICATE_ISSUER}</p></div></div>
        </div>
      </section>

      {message && <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{message.text}</div>}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-700"><FileCheck className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-500">Siap Diterbitkan</p><p className="text-3xl font-semibold text-slate-950">{loading ? "..." : ready}</p></div></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-500">Sudah Diterbitkan</p><p className="text-3xl font-semibold text-slate-950">{loading ? "..." : minted}</p></div></CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><p className="text-sm font-semibold text-slate-500">Status Integrasi</p><div className="mt-3 space-y-2 text-xs leading-6 text-slate-500"><p>• Smart contract Polygon Amoy: <span className="font-semibold text-emerald-700">aktif</span></p><p>• Metadata IPFS/Pinata: <span className="font-semibold text-emerald-700">aktif</span></p><p>• Kontrak live: <span className="font-mono text-[11px] text-slate-700">{contractAddress || "belum diisi"}</span></p></div></CardContent></Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-xl text-slate-950">Daftar Penilaian Siap Diterbitkan</CardTitle><p className="text-sm text-slate-500">Proses mint tetap memakai alur yang sama seperti sebelumnya. Di sini hanya tampilan UI yang dirapikan.</p></CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50"><TableRow><TableHead>Peserta</TableHead><TableHead>Wallet</TableHead><TableHead>Status</TableHead><TableHead>Catatan</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Memuat data penerbitan...</TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Belum ada penilaian yang siap diterbitkan.</TableCell></TableRow> : items.map((item) => <TableRow key={item.id}><TableCell><p className="font-semibold text-slate-900">{item.participant?.full_name || "Peserta"}</p><p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString("id-ID")}</p></TableCell><TableCell className="font-mono text-xs text-slate-600">{item.participant?.wallet_address || "-"}</TableCell><TableCell><Badge variant="outline" className={getAssessmentStatusBadgeClass(item.status)}>{getAssessmentStatusLabel(item.status)}</Badge></TableCell><TableCell className="text-sm text-slate-600">{item.recommendation || "Belum ada catatan hasil penilaian"}</TableCell><TableCell>{item.status === "approved" ? <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={loadingPreviewId === item.id || mintingId === item.id} onClick={() => handlePreview(item.id, item.participant?.full_name || "Peserta")} className="rounded-xl border-slate-200">{loadingPreviewId === item.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}Preview</Button><Button size="sm" disabled={!contractReady || mintingId === item.id || loadingPreviewId === item.id} onClick={() => handleMint(item.id)} className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70">{mintingId === item.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Hammer className="mr-1.5 h-3.5 w-3.5" />}{mintingId === item.id ? "Minting..." : "Mint SBT"}</Button></div> : <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={loadingPreviewId === item.id} onClick={() => handlePreview(item.id, item.participant?.full_name || "Peserta")} className="rounded-xl border-slate-200">{loadingPreviewId === item.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}Review</Button><Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><Link href="/verify"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Verifikasi</Link></Button></div>}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-4xl p-6 bg-slate-900 border-slate-800 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Preview Sertifikat - {previewName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex justify-center items-center rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview Sertifikat"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
