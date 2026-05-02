"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { DetailPageSkeleton } from "@/components/ui/page-skeleton";
import { uploadJsonToIPFS, uploadFileToIPFS } from "@/lib/pinata";
import { certificateContract, client } from "@/lib/thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
export default function AdminMintCertificate() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const account = useActiveAccount();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const certRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    async function fetchAssessment() {
      const { data, error } = await supabase
        .from("assessments")
        .select(
          `
          *,
          competency_schemes(id, name),
          profiles!participant_id(full_name, wallet_address, nik),
          assessor:profiles!assessor_id(full_name)
        `,
        )
        .eq("id", id)
        .single();
      if (data) setAssessment(data);
      setLoading(false);
    }
    fetchAssessment();
  }, [id]);
  const handleApproveAndMint = async () => {
    if (!account) {
      toast.error("Harap hubungkan wallet Anda terlebih dahulu");
      return;
    }
    if (!certificateContract) {
      toast.error("Smart contract belum dikonfigurasi");
      return;
    }
    try {
      setProcessing(true);
      setProcessStep("Menghasilkan gambar sertifikat...");
      const svgGraphic = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
          <rect width="800" height="600" fill="#f8fafc"/>
          <rect x="20" y="20" width="760" height="560" fill="none" stroke="#1e293b" stroke-width="4"/>
          <text x="400" y="150" font-family="Arial" font-size="40" font-weight="bold" fill="#0f172a" text-anchor="middle">SERTIFIKAT KOMPETENSI</text>
          <text x="400" y="250" font-family="Arial" font-size="24" fill="#64748b" text-anchor="middle">Diberikan kepada</text>
          <text x="400" y="320" font-family="Arial" font-size="48" font-weight="bold" fill="#3b82f6" text-anchor="middle">${assessment.profiles.full_name}</text>
          <text x="400" y="400" font-family="Arial" font-size="24" fill="#64748b" text-anchor="middle">telah berhasil menyelesaikan uji kompetensi bidang</text>
          <text x="400" y="470" font-family="Arial" font-size="32" font-weight="bold" fill="#0f172a" text-anchor="middle">${assessment.competency_schemes.name}</text>
        </svg>
      `;
      const svgBlob = new Blob([svgGraphic], { type: "image/svg+xml" });
      const svgFile = new File([svgBlob], "certificate.svg", {
        type: "image/svg+xml",
      });
      setProcessStep("Mengunggah gambar ke IPFS...");
      const imageUri = await uploadFileToIPFS(svgFile);
      setProcessStep("Mengunggah metadata ke IPFS...");
      const metadata = {
        name: `${assessment.competency_schemes.name} - ${assessment.profiles.full_name}`,
        description: "Sertifikat Kompetensi Soulbound Resmi",
        image: imageUri,
        attributes: [
          { trait_type: "Kandidat", value: assessment.profiles.full_name },
          { trait_type: "Skema", value: assessment.competency_schemes.name },
          { trait_type: "Tanggal Terbit", value: new Date().toISOString() },
        ],
      };
      const tokenUri = await uploadJsonToIPFS(metadata);
      setProcessStep("Mencetak NFT Soulbound di Polygon...");
      const { mintTo } = await import("thirdweb/extensions/erc721");
      const transaction = mintTo({
        contract: certificateContract,
        to: assessment.profiles.wallet_address,
        nft: tokenUri,
      });
      const { transactionHash } = await sendTransaction({
        transaction,
        account,
      });
      setProcessStep("Menunggu konfirmasi transaksi...");
      const receipt = await waitForReceipt({
        client,
        chain: certificateContract.chain,
        transactionHash,
      });
      const gasUsed = receipt.gasUsed; 
      const effectiveGasPrice = receipt.effectiveGasPrice; 
      const totalFeeWei = gasUsed * effectiveGasPrice; 
      const totalFeeMatic = Number(totalFeeWei) / 1e18;
      await supabase.from("transaction_logs").insert({
        transaction_hash: transactionHash,
        action_type: "SINGLE_MINT",
        recipients_count: 1,
        gas_used: Number(gasUsed),
        effective_gas_price: Number(effectiveGasPrice),
        total_fee_matic: totalFeeMatic,
      });
      setProcessStep("Memperbarui database...");
      await supabase
        .from("assessments")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", id);
      await supabase.from("certificates").insert({
        assessment_id: assessment.id,
        participant_wallet: assessment.profiles.wallet_address,
        scheme_id: assessment.competency_schemes.id,
        tx_hash: transactionHash,
        ipfs_uri: tokenUri,
        ipfs_image_uri: imageUri,
        status: "active",
        minted_at: new Date().toISOString(),
        minted_by: user?.id,
      });
      toast.success("Sertifikat berhasil dicetak!");
      router.push("/admin/dashboard");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal mencetak sertifikat");
    } finally {
      setProcessing(false);
      setProcessStep("");
    }
  };
  const handleReject = async () => {
    try {
      setProcessing(true);
      await supabase
        .from("assessments")
        .update({ status: "rejected" })
        .eq("id", id);
      toast.success("Penilaian ditolak");
      router.push("/admin/assessments");
    } catch (e: any) {
      toast.error(e.message || "Gagal menolak penilaian");
    } finally {
      setProcessing(false);
    }
  };
  if (loading) return <DetailPageSkeleton sections={4} />;
  if (!assessment) {
    return (
      <ErrorState
        variant="not-found"
        title="Penilaian Tidak Ditemukan"
        description="Data penilaian tidak ada atau sudah dihapus dari sistem."
        backHref="/admin/assessments"
        backLabel="Kembali ke Daftar"
      />
    );
  }
  const isPending = assessment.status === "evaluated";
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Review & Cetak Sertifikat
          </h1>
          <p className="text-slate-500 mt-2">
            Review akhir hasil penjurian sebelum mencetak NFT.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/assessments")}
          disabled={processing}
        >
          Kembali ke Daftar
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Detail Evaluasi</CardTitle>
              <CardDescription>
                Dinilai oleh {assessment.assessor?.full_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Kandidat
                  </h4>
                  <p className="font-medium text-lg">
                    {assessment.profiles?.full_name}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Skema
                  </h4>
                  <p className="font-medium text-lg">
                    {assessment.competency_schemes?.name}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nilai
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex flex-wrap gap-4">
                  {Object.entries(assessment.score || {}).map(
                    ([cId, score]: [string, any]) => (
                      <div
                        key={cId}
                        className="bg-white px-3 py-2 rounded shadow-sm border border-slate-200"
                      >
                        <span className="text-sm text-slate-500 block mb-1">
                          Kriteria {cId}
                        </span>
                        <span className="font-bold text-slate-800">
                          {score} poin
                        </span>
                      </div>
                    ),
                  )}
                  {Object.keys(assessment.score || {}).length === 0 && (
                    <span className="text-slate-500 text-sm">
                      Tidak ada nilai numerik.
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Rekomendasi Asesor
                </h4>
                <div className="bg-blue-50 text-blue-900 p-4 rounded-lg font-medium border border-blue-100">
                  {assessment.recommendation || "Tidak ada rekomendasi."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keputusan</CardTitle>
              <CardDescription>Setujui dan cetak NFT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPending ? (
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-medium text-slate-700">
                    Status Penilaian:{" "}
                    <strong className="capitalize">{assessment.status}</strong>
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    variant="default"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleApproveAndMint}
                    disabled={processing}
                  >
                    {processing ? "Memproses..." : "Setujui & Cetak NFT"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    onClick={handleReject}
                    disabled={processing}
                  >
                    Tolak Pengajuan
                  </Button>
                  {processStep && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800 font-medium animate-pulse">
                      {processStep}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
