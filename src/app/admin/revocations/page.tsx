"use client";
import { useEffect, useState, startTransition, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldBan, ShieldCheck, Search, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { TRAINING_NAME } from "@/lib/app-config";

type Row = { id: string; certificate_number: string; participant_wallet: string; training_name: string; status: string; minted_at: string | null; tx_hash: string | null; token_id: string | null; assessment?: { participant?: { full_name: string | null } | null } | null; };

const statusClass = (s: string) => {
  if (s === "minted" || s === "certified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "revoked") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export default function AdminRevocationsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("sertifikat").select(`id,certificate_number,participant_wallet,training_name,status,minted_at,tx_hash,token_id,assessment:penilaian(participant:profil!participant_id(full_name))`).order("created_at", { ascending: false });
    setItems((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { startTransition(() => { load(); }); }, []);

  const handleRevoke = async (id: string) => {
    if (!reason.trim()) return toast.error("Masukkan alasan pencabutan.");
    const profile = JSON.parse(localStorage.getItem("ssdp_profile") || "{}");
    const wallet = profile.wallet_address;
    const res = await fetch("/api/admin/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reason, wallet_address: wallet }),
    });
    const result = await res.json();
    if (!res.ok) return toast.error(result.error);
    const burnInfo = result.blockchain?.burn
      ? ` (On-chain burned: ${result.blockchain.tx_hash?.slice(0, 10)}...)`
      : " (Database only)";
    toast.success(`Sertifikat berhasil dicabut${burnInfo}`);
    setRevoking(null);
    setReason("");
    load();
  };

  const filtered = items.filter((i) => !search || i.certificate_number.toLowerCase().includes(search.toLowerCase()) || (i.assessment as any)?.participant?.full_name?.toLowerCase().includes(search.toLowerCase()));
  const active = items.filter((i) => i.status === "minted" || i.status === "certified").length;
  const revoked = items.filter((i) => i.status === "revoked").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Pencabutan Sertifikat</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola status sertifikat digital pelatihan <span className="font-semibold">{TRAINING_NAME}</span>.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-100 p-3 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold text-emerald-700">Aktif</p><p className="text-3xl font-black text-slate-900">{loading ? "..." : active}</p></div>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-red-50/50 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-2xl border border-red-200 bg-red-100 p-3 text-red-700"><ShieldBan className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold text-red-700">Dicabut</p><p className="text-3xl font-black text-slate-900">{loading ? "..." : revoked}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-900"><ShieldBan className="h-5 w-5 text-red-600" /> Daftar Sertifikat</CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor/peserta..." className="pl-9 h-9 rounded-xl border-slate-200" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nomor Sertifikat</TableHead>
                  <TableHead>Peserta</TableHead>
                  <TableHead>Token ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Memuat data...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">Belum ada sertifikat.</TableCell></TableRow>
                ) : filtered.map((item) => (
                  <Fragment key={item.id}>
                    <TableRow>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{item.certificate_number}</p>
                        {item.tx_hash && (
                          <a href={`https://amoy.polygonscan.com/tx/${item.tx_hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline">
                            <ExternalLink className="h-2.5 w-2.5" /> PolygonScan
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-900">{(item.assessment as any)?.participant?.full_name || "Nama peserta belum tersedia"}</p>
                        <p className="font-mono text-[10px] text-slate-400">{item.participant_wallet.slice(0, 12)}...</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{item.token_id || "Nama peserta belum tersedia"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusClass(item.status)}>{item.status === "minted" ? "Aktif" : item.status === "revoked" ? "Dicabut" : item.status}</Badge></TableCell>
                      <TableCell>
                        {item.status !== "revoked" ? (
                          <Button size="sm" variant="destructive" onClick={() => setRevoking(revoking === item.id ? null : item.id)} className="bg-red-600 hover:bg-red-700">
                            <ShieldBan className="mr-1.5 h-3.5 w-3.5" /> Cabut
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Sudah dicabut</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {revoking === item.id && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-red-50 p-4">
                          <div className="flex items-center gap-2 text-red-700 mb-3"><AlertTriangle className="h-4 w-4" /><span className="text-sm font-semibold">Konfirmasi Pencabutan Sertifikat</span></div>
                          <div className="flex gap-3">
                            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pencabutan (wajib diisi)..." className="flex-1 rounded-xl border-red-200 bg-white" />
                            <Button size="sm" variant="destructive" onClick={() => handleRevoke(item.id)} className="bg-red-600 hover:bg-red-700">Konfirmasi Cabut</Button>
                            <Button size="sm" variant="outline" onClick={() => setRevoking(null)}>Batal</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

