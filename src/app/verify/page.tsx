"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CertificatePreview } from "@/components/certificate-preview";
import { APP_NAME, TRAINING_FIELD, TRAINING_NAME } from "@/lib/app-config";
import {
  Award, ExternalLink, Search, ShieldCheck, ShieldQuestion, ShieldX, Wifi, WifiOff, FileCheck2,
} from "lucide-react";

type OnChainResult = {
  checked: boolean;
  owner_match: boolean | null;
  on_chain_owner: string | null;
  token_uri: string | null;
  error: string | null;
  tx_hash?: string | null;
  burned?: boolean;
};

type VerifyResult = {
  certificate_number: string;
  training_name: string;
  training_field: string;
  participant_wallet: string;
  token_id: string | null;
  tx_hash: string | null;
  burn_tx_hash: string | null;
  ipfs_image_uri: string | null;
  metadata_uri: string | null;
  status: string;
  minted_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  participant_name: string | null;
  recommendation: string | null;
  score: Record<string, unknown> | null;
  on_chain: OnChainResult | null;
};

const statusLabel = (s: string) => {
  switch (s) {
    case "minted": return "Terbit";
    case "revoked": return "Dicabut";
    case "certified": return "Sertifikat Sudah Diterbitkan";
    case "approved": return "Lulus / Siap Diterbitkan";
    default: return s;
  }
};

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-2 break-all text-sm font-semibold text-slate-950 ${mono ? "font-mono" : ""}`}>
        {value || "Belum tersedia"}
      </p>
    </div>
  );
}

function OnChainBadge({ onChain }: { onChain: OnChainResult | null }) {
  if (!onChain) return null;

  if (!onChain.checked) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Verifikasi on-chain belum tersedia</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{onChain.error || "Kontrak belum dikonfigurasi untuk pemeriksaan on-chain."}</p>
        </div>
      </div>
    );
  }

  if (onChain.burned) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
        <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        <div>
          <p className="text-sm font-semibold text-red-800">Token sudah dibakar (burned)</p>
          <p className="mt-1 text-sm leading-6 text-red-700">Token ini sudah di-burn di blockchain dan tidak lagi valid. Sertifikat telah dicabut secara permanen.</p>
        </div>
      </div>
    );
  }

  if (onChain.error && onChain.owner_match === null) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
        <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Verifikasi on-chain perlu dicek ulang</p>
          <p className="mt-1 text-sm leading-6 text-amber-700">{onChain.error}</p>
        </div>
      </div>
    );
  }

  if (onChain.owner_match === true) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <Wifi className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Data on-chain sesuai</p>
            <p className="mt-1 text-sm leading-6 text-emerald-700">Kepemilikan token cocok dengan wallet peserta yang tersimpan di sistem.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {onChain.token_uri && (
            <a
              href={onChain.token_uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${onChain.token_uri.replace("ipfs://", "")}` : onChain.token_uri}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" /> Metadata IPFS
            </a>
          )}
          {onChain.tx_hash && (
            <a
              href={`https://amoy.polygonscan.com/tx/${onChain.tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" /> PolygonScan
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
      <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <div>
        <p className="text-sm font-semibold text-red-800">Data on-chain tidak cocok</p>
        <p className="mt-1 text-sm leading-6 text-red-700">Owner on-chain: {onChain.on_chain_owner || "Belum tersedia"}. Data ini berbeda dengan wallet peserta di database.</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);

  const runVerification = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/public/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Sertifikat tidak ditemukan.");
      } else {
        setResult(json.result);
      }
    } catch {
      setError("Gagal menghubungi layanan verifikasi publik.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    await runVerification(query);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setQuery(q);
      runVerification(q);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">{APP_NAME}</p>
              <p className="text-xs text-slate-500">Verifikasi Sertifikat Publik</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex sm:items-center sm:gap-1.5">
              <Wifi className="h-3 w-3" /> Polygon Amoy
            </span>
            <Link href="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">Portal Login</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
                  <ShieldCheck className="h-4 w-4" /> Verifikasi Publik Tanpa Login
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Cek keaslian sertifikat digital dengan cepat</h1>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Masukkan nomor sertifikat, token ID, atau wallet address untuk memeriksa sertifikat pelatihan <span className="font-semibold text-slate-900">{TRAINING_NAME}</span> bidang <span className="font-semibold text-slate-900">{TRAINING_FIELD}</span>.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerify} className="mt-8 space-y-4" aria-label="Form verifikasi sertifikat">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="verify-query"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Masukkan nomor sertifikat, token ID, atau wallet address"
                      className="h-12 rounded-xl border-slate-300 pl-11"
                      aria-label="Nomor sertifikat, token ID, atau wallet address"
                    />
                  </div>
                  <Button type="submit" disabled={loading || !query.trim()} className="h-12 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700">
                    {loading ? "Memverifikasi..." : "Verifikasi"}
                  </Button>
                </div>
                <p className="text-sm text-slate-500">Gunakan salah satu dari tiga data ini: nomor sertifikat, token ID, atau wallet address peserta.</p>
              </form>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Sertifikat tidak ditemukan</p>
                  <p className="mt-1 text-sm leading-6 text-red-700">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Sertifikat ditemukan</p>
                        <p className="mt-1 text-sm leading-6 text-emerald-700">Data sertifikat ditemukan di sistem dan bisa dicocokkan kembali dengan bukti publik yang tersedia.</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${result.status === "revoked" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {statusLabel(result.status)}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview Sertifikat</p>
                  {/* Always render CertificatePreview with live data from verification */}
                  <CertificatePreview
                    input={{
                      participantName: result.participant_name || "Peserta",
                      certificateNumber: result.certificate_number,
                      trainingName: result.training_name || TRAINING_NAME,
                      trainingField: result.training_field || TRAINING_FIELD,
                      issuedAt: result.minted_at || new Date().toISOString(),
                      walletAddress: result.participant_wallet,
                    }}
                  />
                  {result.ipfs_image_uri && (
                    <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-500">Tautan IPFS</summary>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={result.ipfs_image_uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${result.ipfs_image_uri.replace("ipfs://", "")}` : result.ipfs_image_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-slate-50"
                        >
                          🖼 Gambar PNG
                        </a>
                        {result.metadata_uri && (
                          <a
                            href={result.metadata_uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${result.metadata_uri.replace("ipfs://", "")}` : result.metadata_uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-slate-50"
                          >
                            📄 Metadata JSON
                          </a>
                        )}
                      </div>
                    </details>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nomor Sertifikat" value={result.certificate_number} />
                    <Field label="Nama Peserta" value={result.participant_name} />
                    <Field label="Pelatihan" value={result.training_name} />
                    <Field label="Bidang" value={result.training_field} />
                    <Field label="Wallet Address" value={result.participant_wallet} mono />
                    <Field label="Token ID" value={result.token_id || "Belum tersedia"} mono />
                    <Field label="Hash Transaksi" value={result.tx_hash || "Belum tersedia"} mono />
                    <Field label="Tanggal Terbit" value={result.minted_at ? new Date(result.minted_at).toLocaleString("id-ID") : "Belum tersedia"} />
                    {result.revoked_at && <Field label="Tanggal Dicabut" value={new Date(result.revoked_at).toLocaleString("id-ID")} />}
                    {result.revocation_reason && <Field label="Alasan Pencabutan" value={result.revocation_reason} />}
                    <div className="md:col-span-2">
                      <Field label="Catatan Hasil" value={result.recommendation || "Belum ada catatan hasil penilaian"} />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pencocokan Data On-Chain</p>
                  <div className="mt-4">
                    <OnChainBadge onChain={result.on_chain} />
                  </div>
                  {result.burn_tx_hash ? (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${result.burn_tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" /> Transaksi Pencabutan di PolygonScan
                    </a>
                  ) : result.tx_hash ? (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${result.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" /> Periksa transaksi di PolygonScan Amoy
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Panduan Singkat</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Masukkan nomor sertifikat, token ID, atau wallet address.</p>
                <p>2. Sistem akan mencari data sertifikat dari portal publik.</p>
                <p>3. Jika tersedia, halaman juga menampilkan bukti kecocokan data on-chain.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Apa yang bisa dicek?</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">Nomor sertifikat, token ID, wallet address peserta, status sertifikat, hash transaksi, dan kecocokan data on-chain.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
