"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ExternalLink, ShieldCheck } from "lucide-react";

type Row = {
  id: string;
  certificate_number: string | null;
  status: string | null;
  minted_at: string | null;
  token_id: string | null;
  tx_hash: string | null;
  metadata_url: string | null;
  ipfs_image_uri: string | null;
  image_url: string | null;
};

type MetadataPreview = {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type?: string; value?: string | number | boolean | null }>;
};

export default function ParticipantCertificatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [metadataById, setMetadataById] = useState<Record<string, MetadataPreview | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (authLoading) return;
      if (!user) {
        if (!mounted) return;
        setItems([]);
        setMetadataById({});
        setLoading(false);
        return;
      }

      setLoading(true);
      const token = localStorage.getItem("ssdp_token");
      if (!token) {
        if (!mounted) return;
        setItems([]);
        setMetadataById({});
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/participant/certificates", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = await response.json();
        if (!mounted) return;
        const nextItems = response.ok ? (payload.items as Row[]) || [] : [];
        setItems(nextItems);
        setMetadataById({});
      } catch {
        if (!mounted) return;
        setItems([]);
        setMetadataById({});
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    let cancelled = false;
    const pending = items.filter((item) => item.metadata_url && metadataById[item.id] === undefined);
    if (!pending.length) return;

    Promise.all(
      pending.map(async (item) => {
        try {
          const response = await fetch(item.metadata_url!, { cache: "no-store" });
          if (!response.ok) return [item.id, null] as const;
          const json = await response.json();
          return [item.id, json as MetadataPreview] as const;
        } catch {
          return [item.id, null] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setMetadataById((prev) => {
        const next = { ...prev };
        for (const [id, metadata] of entries) next[id] = metadata;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [items, metadataById]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700"><Award className="h-5 w-5" /></div><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Sertifikat Saya</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Sertifikat digital yang sudah diterbitkan akan tampil di sini lengkap dengan token ID, hash transaksi, dan tautan verifikasi publik.</p></div></div><Button asChild variant="outline" className="rounded-xl border-slate-200"><Link href="/verify">Buka Verifikasi Publik <ExternalLink className="ml-2 h-4 w-4" /></Link></Button></div></section>
      {loading ? <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">Memuat sertifikat...</div> : items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center"><Award className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 text-base font-semibold text-slate-900">Belum ada sertifikat</p><p className="mt-2 text-sm leading-6 text-slate-500">Sertifikat akan muncul setelah penilaian dinyatakan lulus dan admin menyelesaikan proses penerbitan.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => { const metadata = metadataById[item.id]; return <Card key={item.id} className="overflow-hidden border-slate-200 shadow-sm"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-xl text-slate-950">{item.certificate_number || "Nomor sertifikat belum tersedia"}</CardTitle><p className="mt-2 text-sm text-slate-500">{item.minted_at ? `Diterbitkan ${new Date(item.minted_at).toLocaleString("id-ID")}` : "Tanggal terbit belum tersedia"}</p></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{item.status === "minted" ? "Terbit" : item.status === "certified" ? "Sertifikat Sudah Diterbitkan" : item.status || "-"}</Badge></div></CardHeader><CardContent className="space-y-4">{item.image_url ? <a href={item.image_url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-2 shadow-sm transition hover:border-emerald-300 hover:shadow-lg"><div className="relative overflow-hidden rounded-xl bg-slate-950"><img src={item.image_url} alt={item.certificate_number ? `Preview sertifikat ${item.certificate_number}` : "Preview sertifikat"} className="h-auto w-full rounded-xl object-contain transition duration-300 group-hover:scale-[1.01]" loading="lazy" /><div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Preview Sertifikat</p><p className="mt-1 text-sm font-semibold text-white">Klik untuk membuka gambar penuh</p></div></div></a> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Gambar sertifikat belum tersedia.</div>}{metadata ? <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Metadata</p><div className="mt-3 space-y-3 text-sm text-slate-700"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Nama NFT</p><p className="mt-1 font-semibold text-slate-950">{metadata.name || "Belum tersedia"}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Deskripsi</p><p className="mt-1 leading-6 text-slate-600">{metadata.description || "Belum tersedia"}</p></div>{metadata.attributes?.length ? <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Attributes</p><div className="mt-2 grid gap-2">{metadata.attributes.slice(0, 6).map((attribute, index) => <div key={`${item.id}-attribute-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{attribute.trait_type || "Field"}</p><p className="mt-1 break-all text-sm font-semibold text-slate-900">{String(attribute.value ?? "-")}</p></div>)}</div></div> : null}</div></div> : item.metadata_url ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">Metadata sedang dimuat...</div> : null}<div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Token ID</p><p className="mt-2 break-all text-sm font-semibold text-slate-950">{item.token_id || "Belum tersedia"}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Hash Transaksi</p><p className="mt-2 break-all text-sm font-semibold text-slate-950">{item.tx_hash || "Belum tersedia"}</p></div></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Metadata URL</p><p className="mt-2 break-all text-sm text-slate-600">{item.metadata_url || "Belum tersedia"}</p></div><div className="flex flex-wrap gap-3"><Button asChild size="sm" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"><Link href="/verify"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Verifikasi</Link></Button>{item.tx_hash && <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><a href={`https://amoy.polygonscan.com/tx/${item.tx_hash}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> PolygonScan</a></Button>}{item.metadata_url && <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><a href={item.metadata_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Metadata</a></Button>}{item.image_url && <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200"><a href={item.image_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Gambar</a></Button>}</div></CardContent></Card>; })}</div>}
    </div>
  );
}
