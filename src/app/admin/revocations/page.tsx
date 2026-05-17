"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { useActiveAccount } from "thirdweb/react";
import { certificateContract, client } from "@/lib/thirdweb";
import { prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Search,
  ShieldBan,
  CheckCircle2,
  XCircle,
  Award,
  Wallet,
} from "lucide-react";
let globalRevocationsCache: any[] | null = null;
export default function AdminRevoke() {
  const { user } = useAuth();
  const account = useActiveAccount();
  const [certificates, setCertificates] = useState<any[]>(
    globalRevocationsCache || [],
  );
  const [loading, setLoading] = useState(!globalRevocationsCache);
  const [search, setSearch] = useState("");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fetchCerts = async () => {
    if (!globalRevocationsCache) setLoading(true);
    const { data } = await supabase
      .from("certificates")
      .select(
        `*, competency_schemes(name), assessments(id, profiles!participant_id(full_name, nik, wallet_address))`,
      )
      .order("minted_at", { ascending: false });
    if (data) {
      setCertificates(data);
      globalRevocationsCache = data;
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchCerts();
  }, []);
  const filtered = certificates.filter((c) => {
    const q = search.toLowerCase();
    const participant = (c.assessments as any)?.profiles;
    return (
      c.certificate_number?.toLowerCase().includes(q) ||
      c.token_id?.toLowerCase().includes(q) ||
      participant?.nik?.toLowerCase().includes(q) ||
      participant?.full_name?.toLowerCase().includes(q)
    );
  });
  const openRevoke = (cert: unknown) => {
    setSelectedCert(cert);
    setReason("");
    setConfirmed(false);
    setRevokeOpen(true);
  };
  const handleRevokeConfirm = async () => {
    if (!account) {
      toast.error("Harap hubungkan wallet");
      return;
    }
    if (!reason.trim()) {
      toast.error("Alasan pembatalan wajib diisi");
      return;
    }
    if (!confirmed) {
      toast.error("Centang kotak konfirmasi terlebih dahulu");
      return;
    }
    try {
      setProcessing(true);
      if (certificateContract && selectedCert.token_id) {
        toast.info("Mengirim transaksi revoke ke blockchain...");
        try {
          const tx = prepareContractCall({
            contract: certificateContract,
            method: "function adminBurn(uint256 tokenId)",
            params: [BigInt(selectedCert.token_id)],
          });
          const { transactionHash } = await sendTransaction({
            transaction: tx,
            account,
          });
          await waitForReceipt({
            client,
            chain: certificateContract.chain,
            transactionHash,
          });
        } catch (err: any) {
          console.error("Revoke on-chain failed:", err);
          throw new Error(
            "Transaksi blockchain gagal/dibatalkan. Update database dihentikan.",
          );
        }
      }
      await supabase
        .from("certificates")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
          revocation_reason: reason,
        })
        .eq("id", (selectedCert as any).id);
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user?.id,
          action: "revoke_certificate",
          details: `Sertifikat ${(selectedCert as any).certificate_number} dicabut. Alasan: ${reason}`,
        })
        .maybeSingle();
      toast.success("Sertifikat berhasil dicabut.");
      setRevokeOpen(false);
      setConfirmed(false);
      fetchCerts();
    } catch (e: any) {
      toast.error(e.message || "Gagal mencabut sertifikat");
    } finally {
      setProcessing(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Revoke Sertifikat
        </h1>
        <p className="text-slate-500 mt-1">
          Cari dan cabut sertifikat yang tidak valid atau bermasalah.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Cari nomor sertifikat, Token ID, NIK, atau nama peserta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                No. Sertifikat
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Peserta
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Skema
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Diterbitkan
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Award className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-500">
                      {search
                        ? "Tidak ada sertifikat yang cocok."
                        : "Belum ada sertifikat."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const participant = (c.assessments as any)?.profiles;
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-sm text-slate-700">
                      {c.certificate_number || "—"}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-slate-800">
                        {participant?.full_name || "—"}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        NIK: {participant?.nik || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {(c.competency_schemes as any)?.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {c.minted_at
                        ? format(new Date(c.minted_at), "dd MMM yyyy", {
                            locale: idLocale,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {c.status === "active" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                          <XCircle className="w-3 h-3" /> Dicabut
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={c.status !== "active"}
                        onClick={() => openRevoke(c)}
                      >
                        <ShieldBan className="w-3 h-3" />
                        {c.status === "active" ? "Revoke" : "Dicabut"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldBan className="w-5 h-5" /> Cabut Sertifikat
            </DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="py-2 space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <p className="font-semibold mb-1">
                  ⚠️ Tindakan ini tidak dapat dibatalkan.
                </p>
                <p>
                  Sertifikat{" "}
                  <span className="font-mono font-bold">
                    {selectedCert.certificate_number}
                  </span>{" "}
                  milik{" "}
                  <strong>
                    {(selectedCert.assessments as any)?.profiles?.full_name}
                  </strong>{" "}
                  akan dicabut dari sistem.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <Label>
                    Alasan Pembatalan <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      "Pelanggaran kode etik",
                      "Masa berlaku habis",
                      "Salah input data",
                      "Ditarik oleh Admin",
                      "Pindah ke sertifikat level atas",
                    ].map((templateReason) => (
                      <Badge
                        key={templateReason}
                        variant="secondary"
                        className="cursor-pointer hover:bg-slate-200 text-xs font-normal"
                        onClick={() => setReason(templateReason)}
                      >
                        {templateReason}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setReason(e.target.value)
                  }
                  placeholder="Tuliskan alasan pencabutan sertifikat yang jelas dan detail..."
                  rows={4}
                  className="border-red-200 focus-visible:ring-red-400"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-red-600"
                />
                <span className="text-sm text-slate-700">
                  Saya yakin ingin mencabut sertifikat ini dan memahami bahwa
                  tindakan ini <strong>tidak dapat dibatalkan</strong>.
                </span>
              </label>
              {!account && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  <Wallet className="w-4 h-4 flex-shrink-0" /> Wallet belum
                  terhubung.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeOpen(false)}
              disabled={processing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleRevokeConfirm}
              disabled={processing || !confirmed || !reason.trim()}
            >
              {processing ? (
                <>
                  <Skeleton className="w-4 h-4 rounded-full" /> Mencabut...
                </>
              ) : (
                <>
                  <ShieldBan className="w-4 h-4" /> Revoke Sertifikat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
