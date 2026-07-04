"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ExternalLink, ShieldCheck } from "lucide-react";

type Row = { id: string; certificate_number: string | null; status: string | null; minted_at: string | null; token_id: string | null; tx_hash: string | null; metadata_url: string | null; ipfs_image_uri: string | null; };

export default function ParticipantCertificatesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.wallet_address) return;

      setLoading(true);
      const { data } = await supabase.from("sertifikat").select("id,certificate_number,status,minted_at,token_id,tx_hash,metadata_url,ipfs_image_uri").eq("participant_wallet", user.wallet_address.toLowerCase()).order("created_at", { ascending: false });
      if (!mounted) return;
      setItems((data as Row[]) || []);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [user?.wallet_address]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700"><Award className="h-5 w-5" /></div><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Sertifikat Saya</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Sertifikat digital yang sudah diterbitkan akan tampil di sini lengkap dengan token ID, hash transaksi, dan tautan verifikasi publik.</p></div></div><Button asChild variant="outline" className="rounded-xl border-slate-200"><Link href="/verify">Buka Verifikasi Publik <ExternalLink className="ml-2 h-4 w-4" /></Link></Button></div></section>
      {loading ? <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">Memuat sertifikat...</div> : items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center"><Award className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 text-base font-semibold text-slate-900">Belum ada sertifikat</p><p className="mt-2 text-sm leading-6 text-slate-500">Sertifikat akan muncul setelah penilaian dinyatakan lulus dan admin menyelesaikan proses penerbitan.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <Card key={item.id} className="border-slate-200 shadow-sm"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-xl text-slate-950">{item.certificate_number || "Nomor sertifikat belum tersedia"}</CardTitle><p className="mt-2 text-sm text-slate-500">{item.minted_at ? `Diterbitkan ${new Date(item.minted_at).toLocaleString("id-ID")}` : "Tanggal terbit belum tersedia"}</p></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{item.status === "minted" ? "Terbit" : item.status === "certified" ? "Sertifikat Sudah Diterbitkan" : item.status || "-"}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Token ID</p><p className="mt-2 break-all text-sm font-semibold text-slate-950">{item.token_id || "Belum tersedia"}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Hash Transaksi</p><p className="mt-2 break-all text-sm font-semibold text-slate-950">{item.tx_hash || "Belum tersedia"}</p></div></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Metadata</p><p className="mt-2 break-all text-sm text-slate-600">{item.metadata_url || "Belum tersedia"}</p></div><div className="flex flex-wrap gap-3"><Button asChild size="sm" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"><Link href="/verify"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Verifikasi</Link></Button>{item.tx_hash && <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><a href={`https://amoy.polygonscan.com/tx/${item.tx_hash}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> PolygonScan</a></Button>}{item.metadata_url && <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><a href={item.metadata_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Metadata</a></Button>}</div></CardContent></Card>)}</div>}
    </div>
  );
}
