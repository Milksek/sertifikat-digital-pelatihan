"use client";
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { resolveScheme } from "thirdweb/storage";
import { client } from "@/lib/thirdweb";
import { format, addYears } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Search,
  ShieldCheck,
  ShieldBan,
  Award,
  ExternalLink,
  Printer,
  QrCode,
  X,
  Camera,
  Copy,
  Calendar,
  User,
  BookOpen,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
type VerifyState = "idle" | "loading" | "valid" | "revoked" | "not_found";
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyPageInner />
    </Suspense>
  );
}
function VerifyPageInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<VerifyState>("idle");
  const [result, setResult] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanInterval = useRef<any>(null);
  useEffect(() => {
    const certParam = searchParams.get("cert");
    if (certParam) {
      setQuery(certParam);
      doVerify(certParam);
    }
  }, []);
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
    setQrOpen(false);
  }, []);
  const startQrScan = useCallback(async () => {
    try {
      if (!("BarcodeDetector" in window)) {
        toast.error(
          "Browser Anda tidak mendukung scan QR. Gunakan Chrome/Edge terbaru.",
        );
        return;
      }
      setQrOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      detectorRef.current = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      });
      scanInterval.current = setInterval(async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            const extracted = raw.includes("?cert=")
              ? raw.split("?cert=")[1]
              : raw;
            stopCamera();
            setQuery(extracted);
            doVerify(extracted);
            toast.success("QR berhasil discan!");
          }
        } catch {}
      }, 500);
    } catch (e: unknown) {
      toast.error(
        "Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.",
      );
      setQrOpen(false);
    }
  }, [stopCamera]);
  const doVerify = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setState("loading");
    setResult(null);
    setImageUrl("");
    
    const totalStartTime = performance.now();
    let bcTime = 0;
    let ipfsTime = 0;
    try {
      
      let data: any = null;
      let error: any = null;

      
      const directRes = await supabase
        .from("certificates")
        .select(
          `*, competency_schemes(name, criteria),
          assessments(id, recommendation, score,
            profiles!participant_id(full_name, nik, wallet_address))`,
        )
        .or(`certificate_number.eq.${trimmed},token_id.eq.${trimmed}`)
        .maybeSingle();

      if (directRes.data) {
        data = directRes.data;
        error = directRes.error;
      } else if (trimmed.startsWith("0x")) {
        
        const walletRes = await supabase
          .from("certificates")
          .select(
            `*, competency_schemes(name, criteria),
            assessments(id, recommendation, score,
              profiles!participant_id(full_name, nik, wallet_address))`,
          )
          .ilike("participant_wallet", trimmed)
          .limit(1)
          .maybeSingle();
        data = walletRes.data;
        error = walletRes.error;
      } else {
        error = directRes.error;
      }
      if (error || !data || !data.token_id) {
        setState("not_found");
        return;
      }
      try {
        const { readContract } = await import("thirdweb");
        const { certificateContract } = await import("@/lib/thirdweb");
        if (!certificateContract) throw new Error("Contract not connected");
        const bcStartTime = performance.now();
        const owner = await readContract({
          contract: certificateContract,
          method: "function ownerOf(uint256 tokenId) view returns (address)",
          params: [BigInt(data.token_id)],
        });
        const tokenURI = await readContract({
          contract: certificateContract,
          method: "function tokenURI(uint256 tokenId) view returns (string)",
          params: [BigInt(data.token_id)],
        });
        bcTime = performance.now() - bcStartTime;
        const ipfsStartTime = performance.now();
        const uri = data.ipfs_image_uri || data.metadata_uri;
        if (uri) {
          const url = resolveScheme({ client, uri });
          await fetch(url, { method: "HEAD" }).catch(() => {});
          setImageUrl(url);
        }
        ipfsTime = performance.now() - ipfsStartTime;
        setResult(data);
        setState(data.status === "active" ? "valid" : "revoked");
        const totalTime = performance.now() - totalStartTime;
        console.table({
          "Waktu Baca L2 Blockchain": `${bcTime.toFixed(2)} ms`,
          "Waktu IPFS & Render": `${ipfsTime.toFixed(2)} ms`,
          "Total TTV (Waktu Verifikasi)": `${totalTime.toFixed(2)} ms`,
        });
        supabase
          .from("verification_logs")
          .insert({
            certificate_id: data.id,
            query: trimmed,
            verifier_ip: "public",
            blockchain_time_ms: bcTime,
            ipfs_time_ms: ipfsTime,
            total_time_ms: totalTime
          })
          .then();
      } catch (bcError) {
        console.error("Gagal Verifikasi On-Chain:", bcError);
        setState("not_found");
        return;
      }
    } catch {
      setState("not_found");
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doVerify(query);
  };
  const handlePrint = () => window.print();
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin!");
  };
  const participant = result?.assessments?.profiles;
  const scheme = result?.competency_schemes;
  const criteriaList = Array.isArray(scheme?.criteria) ? scheme.criteria : [];
  const expiry = result?.minted_at
    ? addYears(new Date(result.minted_at), 3)
    : null;
  const isExpired = expiry ? expiry < new Date() : false;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col font-sans print:bg-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm print:border-0">
        <a
          href="/"
          className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-slate-900"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow">
            <Award className="w-4 h-4 text-white" />
          </div>
          KOMPETEN.ID
        </a>
        <a
          href="/login"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors print:hidden"
        >
          Portal Login →
        </a>
      </header>
      <main className="flex-1 flex flex-col items-center pt-12 px-4 pb-16 print:pt-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10 print:hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              <Lock className="w-3.5 h-3.5" /> Verifikasi Blockchain
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
              Cek Keaslian Sertifikat
            </h1>
            <p className="text-lg text-slate-500 max-w-lg mx-auto">
              Masukkan Nomor Sertifikat atau Token ID untuk memverifikasi
              keaslian sertifikat kompetensi secara kriptografis di blockchain
              Polygon.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-3 mb-6 print:hidden">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nomor Sertifikat, Token ID, atau Wallet (0x...)..."
                  className="h-14 pl-12 pr-4 text-base bg-slate-50 border-slate-200 focus:border-blue-400 rounded-xl"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-14 px-4 rounded-xl border-slate-200 hover:bg-slate-50 gap-2"
                onClick={startQrScan}
                title="Scan QR Code"
              >
                <QrCode className="w-5 h-5 text-slate-500" />
                <span className="hidden sm:inline text-sm">Scan QR</span>
              </Button>
              <Button
                type="submit"
                disabled={state === "loading" || !query.trim()}
                className="h-14 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-base shadow-sm"
              >
                {state === "loading" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />{" "}
                    Memverifikasi...
                  </>
                ) : (
                  "Verifikasi"
                )}
              </Button>
            </form>
          </div>
          {qrOpen && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Camera className="w-4 h-4 text-blue-600" /> Arahkan ke QR
                    Code
                  </div>
                  <button
                    onClick={stopCamera}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/70 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center mt-3">
                  Scan otomatis ketika QR terdeteksi
                </p>
              </div>
            </div>
          )}
          {state === "not_found" && (
            <div className="text-center py-12 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Sertifikat Tidak Ditemukan
              </h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Pastikan Nomor Sertifikat atau Token ID yang dimasukkan benar
                dan sesuai dengan yang tertera pada dokumen.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setState("idle");
                  setQuery("");
                }}
              >
                Coba Lagi
              </Button>
            </div>
          )}
          {state === "valid" && result && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-bold text-emerald-800">
                      ✅ SERTIFIKAT VALID
                    </h2>
                    {!isExpired ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-emerald-600">
                    Sertifikat ini terverifikasi di blockchain Polygon dan sah
                    secara kriptografis.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                {imageUrl && (
                  <div className="aspect-[16/6] overflow-hidden bg-slate-100">
                    <img
                      src={imageUrl}
                      alt="Sertifikat"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow
                      icon={Hash}
                      label="Nomor Sertifikat"
                      value={result.certificate_number}
                      copyable
                      onCopy={handleCopy}
                    />
                    <InfoRow
                      icon={User}
                      label="Nama Pemegang"
                      value={participant?.full_name || "—"}
                    />
                    <InfoRow
                      icon={BookOpen}
                      label="Skema Kompetensi"
                      value={scheme?.name || "—"}
                    />
                    <InfoRow
                      icon={Calendar}
                      label="Tanggal Terbit"
                      value={
                        result.minted_at
                          ? format(new Date(result.minted_at), "dd MMMM yyyy", {
                              locale: idLocale,
                            })
                          : "—"
                      }
                    />
                  </div>
                  {expiry && (
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl border ${isExpired ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"}`}
                    >
                      <Calendar
                        className={`w-4 h-4 flex-shrink-0 ${isExpired ? "text-orange-500" : "text-blue-500"}`}
                      />
                      <div>
                        <p
                          className={`text-xs font-semibold uppercase tracking-wider ${isExpired ? "text-orange-600" : "text-blue-600"}`}
                        >
                          Berlaku s/d
                        </p>
                        <p
                          className={`font-semibold ${isExpired ? "text-orange-800" : "text-blue-800"}`}
                        >
                          {format(expiry, "dd MMMM yyyy", { locale: idLocale })}
                          {isExpired && " (Masa berlaku habis)"}
                        </p>
                      </div>
                    </div>
                  )}
                  {criteriaList.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Unit Kompetensi
                        ({criteriaList.length})
                      </p>
                      <div className="space-y-1">
                        {criteriaList.map((c: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm text-slate-700 py-1 border-b border-slate-50 last:border-0"
                          >
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Info Blockchain
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Jaringan</span>
                      <span className="font-medium">Polygon Amoy</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Standar Token</span>
                      <span className="font-medium">ERC-721 Soulbound</span>
                    </div>
                    {result.token_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Token ID</span>
                        <span className="font-mono font-medium">
                          {result.token_id}
                        </span>
                      </div>
                    )}
                    {result.tx_hash && (
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Transaksi</span>
                        <span className="font-mono text-xs text-slate-600 truncate max-w-[120px]">
                          {result.tx_hash.slice(0, 10)}...
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
                    {result.tx_hash && (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${result.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full gap-2 border-slate-200"
                        >
                          <ExternalLink className="w-4 h-4" /> Lihat di
                          Blockchain
                        </Button>
                      </a>
                    )}
                    <Button
                      className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                      onClick={handlePrint}
                    >
                      <Printer className="w-4 h-4" /> Cetak PDF
                    </Button>
                  </div>
                  {result.participant_wallet && (
                    <a
                      href={`/p/${result.participant_wallet}`}
                      target="_blank"
                      rel="noreferrer"
                      className="print:hidden"
                    >
                      <Button variant="outline" className="w-full gap-2 border-slate-200 text-slate-600">
                        <User className="w-4 h-4" /> Lihat Semua Sertifikat Pemilik
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
          {state === "revoked" && result && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <ShieldBan className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-800 mb-0.5">
                    ❌ SERTIFIKAT DICABUT
                  </h2>
                  <p className="text-sm text-red-600">
                    Sertifikat ini telah dicabut oleh LSP Admin dan tidak lagi
                    berlaku.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow
                    icon={Hash}
                    label="Nomor Sertifikat"
                    value={result.certificate_number}
                  />
                  <InfoRow
                    icon={User}
                    label="Nama Pemegang"
                    value={participant?.full_name || "—"}
                  />
                  <InfoRow
                    icon={BookOpen}
                    label="Skema Kompetensi"
                    value={scheme?.name || "—"}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Tanggal Terbit"
                    value={
                      result.minted_at
                        ? format(new Date(result.minted_at), "dd MMMM yyyy", {
                            locale: idLocale,
                          })
                        : "—"
                    }
                  />
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                    <ShieldBan className="w-3.5 h-3.5" /> Detail Pencabutan
                  </p>
                  {result.revoked_at && (
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">
                        Dicabut pada:{" "}
                      </span>
                      <span className="text-red-800">
                        {format(
                          new Date(result.revoked_at),
                          "dd MMMM yyyy, HH:mm",
                          { locale: idLocale },
                        )}
                      </span>
                    </div>
                  )}
                  {result.revocation_reason && (
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">Alasan: </span>
                      <span className="text-red-800">
                        {result.revocation_reason}
                      </span>
                    </div>
                  )}
                </div>
                {result.tx_hash && (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${result.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <ExternalLink className="w-4 h-4" /> Lihat Riwayat
                      Blockchain
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
          {state === "idle" && (
            <div className="mt-12 grid grid-cols-3 gap-4 text-center print:hidden">
              {[
                {
                  icon: Lock,
                  title: "Blockchain-Verified",
                  desc: "Setiap sertifikat ditulis permanen di Polygon",
                },
                {
                  icon: ShieldCheck,
                  title: "Anti-Pemalsuan",
                  desc: "NFT soulbound tidak dapat dipalsukan",
                },
                {
                  icon: Unlock,
                  title: "Akses Publik",
                  desc: "Siapapun dapat memverifikasi tanpa login",
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm"
                  >
                    <Icon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      {f.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 print:hidden">
        © 2024 KOMPETEN.ID — Identitas Kompetensi Anda, Terjamin di Blockchain
      </footer>
    </div>
  );
}
function InfoRow({
  icon: Icon,
  label,
  value,
  copyable,
  onCopy,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="font-semibold text-slate-800 text-sm">{value}</p>
        {copyable && onCopy && (
          <button
            onClick={() => onCopy(value)}
            className="text-slate-300 hover:text-slate-600 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
