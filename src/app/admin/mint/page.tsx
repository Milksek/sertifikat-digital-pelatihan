"use client";
import { useEffect, useState, Suspense } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { useActiveAccount } from "thirdweb/react";
import { uploadFileToIPFS, uploadJsonToIPFS } from "@/lib/pinata";
import { certificateContract, client } from "@/lib/thirdweb";
import {
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from "thirdweb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Award,
  Upload,
  Loader2,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
type MintStep =
  | "idle"
  | "uploading_image"
  | "uploading_metadata"
  | "minting"
  | "confirming"
  | "success";
interface PreviewData {
  assessmentId: string;
  dataUrl: string;
  participantName: string;
}
function MintPageInner() {
  const { user } = useAuth();
  const account = useActiveAccount();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("assessment");
  const [approvedAssessments, setApprovedAssessments] = useState<any[]>([]);
  const [uniqueSchemes, setUniqueSchemes] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedSchemeFilter, setSelectedSchemeFilter] =
    useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    preselect ? [preselect] : [],
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [mintStep, setMintStep] = useState<MintStep>("idle");
  const [resultDetails, setResultDetails] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<PreviewData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    const { data } = await supabase
      .from("assessments")
      .select(
        `
        id, recommendation, evaluated_at,
        competency_schemes(id, name, criteria),
        profiles!participant_id(full_name, wallet_address, nik)
      `,
      )
      .eq("status", "approved")
      .order("evaluated_at", { ascending: false });
    if (data) {
      setApprovedAssessments(data);
      const schemesMap = new Map();
      data.forEach((a) => {
        const scheme = a.competency_schemes as any;
        if (scheme && !schemesMap.has(scheme.id)) {
          schemesMap.set(scheme.id, { id: scheme.id, name: scheme.name });
        }
      });
      setUniqueSchemes(Array.from(schemesMap.values()));
    }
    setLoadingAssessments(false);
  };
  useEffect(() => {
    fetchAssessments();
  }, []);
  const filteredAssessments =
    selectedSchemeFilter === "all"
      ? approvedAssessments
      : approvedAssessments.filter(
          (a) => (a.competency_schemes as any)?.id === selectedSchemeFilter,
        );
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };
  const drawTextLeft = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
  ) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, x, y);
  };
  const drawText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: CanvasTextAlign = "left",
  ) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, x, y);
  };
  const generateSinglePreview = async (
    assessment: any,
    templateSrc: string,
  ): Promise<PreviewData> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context error");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const participant = assessment.profiles as any;
        const scheme = assessment.competency_schemes as any;
        const ts = Date.now().toString().slice(-6);
        const autoCertNumber = `CERT-${ts}-${assessment.id.slice(0, 4).toUpperCase()}`;
        drawTextLeft(
          ctx,
          autoCertNumber,
          100,
          150,
          "bold 50px 'Courier New', monospace",
          "#ffffff",
        );
        const nameX = 890;
        const nameY = 1020;
        drawTextLeft(
          ctx,
          participant.full_name.toUpperCase(),
          nameX,
          nameY,
          "bold 100px Poppins, sans-serif",
          "#ffffff",
        );
        const schemeX = 890;
        const schemeY = 1460;
        drawTextLeft(
          ctx,
          scheme.name,
          schemeX,
          schemeY,
          "bold 50px Poppins, sans-serif",
          "#ffffff",
        );
        const dateX = 900;
        const dateY = 1560;
        const dateStr = new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        drawTextLeft(
          ctx,
          `Diterbitkan: ${dateStr}`,
          dateX,
          dateY,
          "25px Poppins, sans-serif",
          "#ffffff",
        );
        try {
          const verifyUrl = `${window.location.origin}/verify?cert=${autoCertNumber}`;
          const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
            width: 200,
            margin: 1,
          });
          const qrImg = new Image();
          qrImg.onload = () => {
            const qrSize = 250;
            ctx.drawImage(
              qrImg,
              canvas.width - qrSize - 40,
              canvas.height - qrSize - 40,
              qrSize,
              qrSize,
            );
            resolve({
              assessmentId: assessment.id,
              dataUrl: canvas.toDataURL("image/webp", 0.9),
              participantName: participant.full_name,
            });
          };
          qrImg.src = qrDataUrl;
        } catch (err) {
          resolve({
            assessmentId: assessment.id,
            dataUrl: canvas.toDataURL("image/webp", 0.9),
            participantName: participant.full_name,
          });
        }
      };
      img.onerror = () => reject("Image load error");
      img.src = templateSrc;
    });
  };
  const handleGeneratePreviews = async () => {
    if (!account) return toast.error("Harap hubungkan wallet MetaMask");
    if (selectedIds.length === 0)
      return toast.error("Pilih minimal satu peserta");
    if (!imagePreview)
      return toast.error("Upload gambar template master terlebih dahulu");
    setIsGenerating(true);
    toast.loading("Membangun gambar sertifikat...", { id: "gen-preview" });
    try {
      const previews: PreviewData[] = [];
      for (const id of selectedIds) {
        const assessment = approvedAssessments.find((a) => a.id === id);
        if (assessment) {
          const preview = await generateSinglePreview(assessment, imagePreview);
          previews.push(preview);
        }
      }
      setPreviewImages(previews);
      setIsPreviewOpen(true);
      toast.success("Preview berhasil di-generate!", { id: "gen-preview" });
    } catch (error) {
      console.error(error);
      toast.error("Gagal men-generate preview", { id: "gen-preview" });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleMint = async () => {
    if (!account || previewImages.length === 0 || !certificateContract) return;
    try {
      setIsPreviewOpen(false);
      let successCount = 0;
      const transactions = [];
      const recipients: string[] = [];
      const metadataUris: string[] = [];
      const preparedDatabaseData: any[] = [];
      for (let i = 0; i < previewImages.length; i++) {
        const preview = previewImages[i];
        const assessment = approvedAssessments.find(
          (a) => a.id === preview.assessmentId,
        );
        if (!assessment) continue;
        const participant = assessment.profiles as any;
        const scheme = assessment.competency_schemes as any;
        const res = await fetch(preview.dataUrl);
        const blob = await res.blob();
        const generatedFile = new File(
          [blob],
          `certificate-${assessment.id}.webp`,
          { type: "image/webp" },
        );
        setMintStep("uploading_image");
        toast.loading(
          `Mengunggah gambar ${i + 1}/${previewImages.length}: ${participant.full_name}...`,
          { id: "mint-progress" },
        );
        const imageUri = await uploadFileToIPFS(generatedFile);
        const ts = Date.now().toString().slice(-6);
        const autoCertNumber = `CERT-${ts}-${assessment.id.slice(0, 4).toUpperCase()}`;
        setMintStep("uploading_metadata");
        toast.loading(
          `Mengunggah metadata ${i + 1}/${previewImages.length}: ${participant.full_name}...`,
          { id: "mint-progress" },
        );
        const metadata = {
          name: `Sertifikat Kompetensi: ${scheme.name}`,
          description: `Sertifikat NFT diterbitkan untuk ${participant.full_name}`,
          image: imageUri,
          attributes: [
            { trait_type: "Scheme", value: scheme.name },
            { trait_type: "Certificate Number", value: autoCertNumber },
            { trait_type: "Recipient", value: participant.full_name },
            {
              trait_type: "Recommendation",
              value: assessment.recommendation?.split(" - ")[0] || "",
            },
            { trait_type: "Issued At", value: new Date().toISOString() },
          ],
          criteria: Array.isArray(scheme.criteria) ? scheme.criteria : [],
        };
        const metadataUri = await uploadJsonToIPFS(metadata);
        recipients.push(participant.wallet_address);
        metadataUris.push(metadataUri);
        preparedDatabaseData.push({
          assessment_id: assessment.id,
          scheme_id: scheme.id,
          certificate_number: autoCertNumber,
          metadata_uri: metadataUri,
          status: "active",
          minted_by: user?.id,
          minted_at: new Date().toISOString(),
          participant_wallet: participant.wallet_address.toLowerCase(),
          ipfs_image_uri: imageUri,
          participant_name: participant.full_name, 
        });
      }
      setMintStep("minting");
      toast.loading(
        `Menunggu tanda tangan MetaMask untuk mencetak ${recipients.length} Sertifikat NFT...`,
        { id: "mint-progress" },
      );
      let startTokenId = BigInt(0);
      try {
        startTokenId = await readContract({
          contract: certificateContract,
          method: "function nextTokenIdToMint() view returns (uint256)",
          params: [],
        });
      } catch {
        console.warn("Gagal membaca nextTokenIdToMint, fallback ke 0");
      }
      const transaction = prepareContractCall({
        contract: certificateContract,
        method:
          "function batchMintToMultiple(address[] calldata recipients, string[] calldata uris)",
        params: [recipients, metadataUris],
      });
      setMintStep("confirming");
      const { transactionHash } = await sendTransaction({
        transaction,
        account,
      });
      toast.loading("Mengonfirmasi blok transaksi di Polygon...", {
        id: "mint-progress",
      });
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
        action_type: "BATCH_MINT",
        recipients_count: recipients.length,
        gas_used: Number(gasUsed),
        effective_gas_price: Number(effectiveGasPrice),
        total_fee_matic: totalFeeMatic,
      });
      for (let i = 0; i < preparedDatabaseData.length; i++) {
        const data = preparedDatabaseData[i];
        const realTokenId = (startTokenId + BigInt(i)).toString();
        await supabase.from("certificates").insert({
          assessment_id: data.assessment_id,
          scheme_id: data.scheme_id,
          certificate_number: data.certificate_number,
          metadata_uri: data.metadata_uri,
          tx_hash: transactionHash,
          token_id: realTokenId,
          status: data.status,
          minted_by: data.minted_by,
          minted_at: data.minted_at,
          participant_wallet: data.participant_wallet,
          ipfs_image_uri: data.ipfs_image_uri,
        });
        await supabase
          .from("assessments")
          .update({ status: "certified" })
          .eq("id", data.assessment_id);
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user?.id,
            action: "mint_nft",
            details: `NFT Diterbitkan (${data.participant_name}) – Tx: ${transactionHash}`,
          })
          .maybeSingle();
        transactions.push({
          name: data.participant_name,
          txHash: transactionHash,
          tokenId: realTokenId,
        });
        successCount++;
      }
      toast.dismiss("mint-progress");
      setResultDetails(transactions);
      setMintStep("success");
      toast.success(
        `${successCount} Sertifikat NFT berhasil diterbitkan dengan 1 kali klik!`,
      );
      fetchAssessments();
    } catch (e: any) {
      toast.dismiss("mint-progress");
      console.error(e);
      toast.error(e.message || "Proses mint batch gagal");
      setMintStep("idle");
    }
  };
  const handleMintOneByOne = async () => {
    if (!account || previewImages.length === 0 || !certificateContract) return;
    try {
      setIsPreviewOpen(false);
      let successCount = 0;
      const transactions = [];
      for (let i = 0; i < previewImages.length; i++) {
        const preview = previewImages[i];
        const assessment = approvedAssessments.find(
          (a) => a.id === preview.assessmentId,
        );
        if (!assessment) continue;
        const participant = assessment.profiles as any;
        const scheme = assessment.competency_schemes as any;
        const res = await fetch(preview.dataUrl);
        const blob = await res.blob();
        const generatedFile = new File(
          [blob],
          `certificate-${assessment.id}.webp`,
          { type: "image/webp" },
        );
        setMintStep("uploading_image");
        toast.loading(
          `[${i + 1}/${previewImages.length}] Mengunggah gambar: ${participant.full_name}...`,
          { id: "mint-progress" },
        );
        const imageUri = await uploadFileToIPFS(generatedFile);
        const ts = Date.now().toString().slice(-6);
        const autoCertNumber = `CERT-${ts}-${assessment.id.slice(0, 4).toUpperCase()}`;
        setMintStep("uploading_metadata");
        toast.loading(
          `[${i + 1}/${previewImages.length}] Mengunggah metadata: ${participant.full_name}...`,
          { id: "mint-progress" },
        );
        const metadata = {
          name: `Sertifikat Kompetensi: ${scheme.name}`,
          description: `Sertifikat NFT diterbitkan untuk ${participant.full_name}`,
          image: imageUri,
          attributes: [
            { trait_type: "Scheme", value: scheme.name },
            { trait_type: "Certificate Number", value: autoCertNumber },
            { trait_type: "Recipient", value: participant.full_name },
            {
              trait_type: "Recommendation",
              value: assessment.recommendation?.split(" - ")[0] || "",
            },
            { trait_type: "Issued At", value: new Date().toISOString() },
          ],
          criteria: Array.isArray(scheme.criteria) ? scheme.criteria : [],
        };
        const metadataUri = await uploadJsonToIPFS(metadata);
        setMintStep("minting");
        toast.loading(
          `[${i + 1}/${previewImages.length}] Menunggu MetaMask: ${participant.full_name}...`,
          { id: "mint-progress" },
        );
        let tokenId = BigInt(0);
        try {
          tokenId = await readContract({
            contract: certificateContract,
            method: "function nextTokenIdToMint() view returns (uint256)",
            params: [],
          });
        } catch {
          console.warn("Gagal membaca nextTokenIdToMint, fallback ke 0");
        }
        const transaction = prepareContractCall({
          contract: certificateContract,
          method:
            "function batchMintToMultiple(address[] calldata recipients, string[] calldata uris)",
          params: [[participant.wallet_address], [metadataUri]],
        });
        setMintStep("confirming");
        const { transactionHash } = await sendTransaction({
          transaction,
          account,
        });
        toast.loading(
          `[${i + 1}/${previewImages.length}] Mengonfirmasi transaksi...`,
          { id: "mint-progress" },
        );
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
        await supabase.from("certificates").insert({
          assessment_id: assessment.id,
          scheme_id: scheme.id,
          certificate_number: autoCertNumber,
          metadata_uri: metadataUri,
          tx_hash: transactionHash,
          token_id: tokenId.toString(),
          status: "active",
          minted_by: user?.id,
          minted_at: new Date().toISOString(),
          participant_wallet: participant.wallet_address.toLowerCase(),
          ipfs_image_uri: imageUri,
        });
        await supabase
          .from("assessments")
          .update({ status: "certified" })
          .eq("id", assessment.id);
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user?.id,
            action: "mint_nft",
            details: `NFT Diterbitkan (${participant.full_name}) – Tx: ${transactionHash}`,
          })
          .maybeSingle();
        transactions.push({
          name: participant.full_name,
          txHash: transactionHash,
          tokenId: tokenId.toString(),
        });
        successCount++;
      }
      toast.dismiss("mint-progress");
      setResultDetails(transactions);
      setMintStep("success");
      toast.success(
        `${successCount} Sertifikat NFT berhasil diterbitkan satu per satu! (${successCount} transaksi)`,
      );
      fetchAssessments();
    } catch (e: any) {
      toast.dismiss("mint-progress");
      console.error(e);
      toast.error(e.message || "Proses mint gagal");
      setMintStep("idle");
    }
  };
  const stepLabel: Record<MintStep, string> = {
    idle: "Mint Sertifikat NFT",
    uploading_image: "Mengunggah template ke IPFS...",
    uploading_metadata: "Mengunggah metadata...",
    minting: "Minting NFT (Batch)...",
    confirming: "Konfirmasi transaksi jaringan...",
    success: "Berhasil!",
  };
  const isMinting = [
    "uploading_image",
    "uploading_metadata",
    "minting",
    "confirming",
  ].includes(mintStep);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          Batch Minting NFT
          <Badge className="bg-blue-100 text-blue-800 border-none hover:bg-blue-200">
            New
          </Badge>
        </h1>
        <p className="text-slate-500 mt-1">
          Terbitkan banyak sertifikat NFT soulbound sekaligus secara sekuensial
          ke wallet peserta yang valid.
        </p>
      </div>
      {mintStep === "success" && resultDetails.length > 0 ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900">
              {resultDetails.length} Sertifikat Berhasil Diterbitkan!
            </h2>
            <div className="text-left space-y-2 max-h-64 overflow-y-auto pr-2">
              {resultDetails.map((res, i) => (
                <div
                  key={i}
                  className="flex flex-col p-3 bg-white rounded-xl border border-emerald-200 shadow-sm"
                >
                  <span className="text-sm font-bold text-slate-800 mb-1">
                    {res.name}
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Token ID:{" "}
                      <span className="font-mono text-slate-800">
                        {res.tokenId}
                      </span>
                    </span>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${res.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      Tx Hash <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                setMintStep("idle");
                setSelectedIds([]);
                setImageFile(null);
                setImagePreview("");
                setResultDetails([]);
              }}
            >
              Selesai
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-slate-200 h-full flex flex-col">
              <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" /> Pilih Peserta
                  Lulus
                  {selectedIds.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 font-mono text-xs"
                    >
                      {selectedIds.length} Terpilih
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col gap-4">
                {loadingAssessments ? (
                  <Skeleton className="h-64 w-full" />
                ) : approvedAssessments?.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Tidak ada assessment yang siap disahkan. Selesaikan proses
                    penilaian terlebih dahulu!
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 pl-2">
                        Filter Skema:
                      </span>
                      <Select
                        value={selectedSchemeFilter}
                        onValueChange={(val) => {
                          setSelectedSchemeFilter(val);
                          setSelectedIds([]);
                        }}
                      >
                        <SelectTrigger className="w-full bg-white h-8 text-xs border-slate-200">
                          <SelectValue placeholder="Semua Skema Sertifikasi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Semua Skema Sertifikasi
                          </SelectItem>
                          {uniqueSchemes.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border border-slate-200 rounded-xl max-h-[400px] overflow-y-auto w-full">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="w-[50px] text-center">
                              <input
                                type="checkbox"
                                className="accent-blue-600 w-4 h-4 cursor-pointer"
                                checked={
                                  selectedIds.length ===
                                    filteredAssessments.length &&
                                  filteredAssessments.length > 0
                                }
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setSelectedIds(
                                      filteredAssessments.map((a) => a.id),
                                    );
                                  else setSelectedIds([]);
                                }}
                              />
                            </TableHead>
                            <TableHead>Peserta</TableHead>
                            <TableHead>Skema Kompetensi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAssessments.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center text-slate-500 py-8"
                              >
                                Tidak ada peserta lulus untuk skema ini.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAssessments.map((a) => {
                              const isSelected = selectedIds.includes(a.id);
                              return (
                                <TableRow
                                  key={a.id}
                                  className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50/50 hover:bg-blue-50/80" : "hover:bg-slate-50"}`}
                                  onClick={() => {
                                    setSelectedIds((prev) =>
                                      prev.includes(a.id)
                                        ? prev.filter((id) => id !== a.id)
                                        : [...prev, a.id],
                                    );
                                  }}
                                >
                                  <TableCell
                                    className="text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked)
                                          setSelectedIds((prev) => [
                                            ...prev,
                                            a.id,
                                          ]);
                                        else
                                          setSelectedIds((prev) =>
                                            prev.filter((id) => id !== a.id),
                                          );
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <p className="font-semibold text-slate-800">
                                      {(a.profiles as any)?.full_name}
                                    </p>
                                    <p className="font-mono text-[10px] text-slate-400">
                                      {(
                                        a.profiles as any
                                      )?.wallet_address?.slice(0, 12)}
                                      ...
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-slate-600 text-xs font-medium">
                                    {(a.competency_schemes as any)?.name}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100 py-4">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" /> Desain Sertifikat
                  Master
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 leading-relaxed mb-2">
                  <strong>Penting:</strong> Nomor sertifikat akan di-generate
                  secara otomatis untuk menghindari duplikasi saat Batch
                  Minting.
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-400" /> Template
                    Visual
                  </Label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${imagePreview ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}
                    onClick={() =>
                      document.getElementById("cert-image")?.click()
                    }
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 mx-auto rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Upload className="w-8 h-8" />
                        <p className="text-sm">
                          Klik untuk upload template master
                        </p>
                        <p className="text-xs">Berlaku untuk seluruh peserta</p>
                      </div>
                    )}
                    <input
                      id="cert-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`transition-all ${isMinting ? "border-amber-400 bg-amber-50" : "border-blue-200 bg-blue-50"}`}
            >
              <CardContent className="p-5">
                {!account && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3 text-sm text-yellow-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> Wallet
                    MetaMask belum terhubung!
                  </div>
                )}
                {isMinting && (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-amber-700 font-bold mb-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Sedang
                      Memproses Batch...
                    </div>
                  </div>
                )}
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold gap-2 shadow-md hover:shadow-lg transition-all"
                  onClick={handleGeneratePreviews}
                  disabled={
                    isGenerating ||
                    isMinting ||
                    !account ||
                    selectedIds.length === 0 ||
                    !imagePreview
                  }
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Sedang
                      Membangun...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" /> Generate & Preview (
                      {selectedIds.length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Sertifikat</DialogTitle>
            <DialogDescription>
              Periksa kembali nama dan nomor sertifikat. Gambar ini yang akan
              diunggah ke IPFS dan dicetak sebagai NFT.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-inner space-y-8">
            {previewImages.map((preview, idx) => (
              <div key={idx} className="space-y-2">
                <p className="font-semibold text-sm text-slate-700">
                  {idx + 1}. {preview.participantName}
                </p>
                <img
                  src={preview.dataUrl}
                  alt={`Preview ${preview.participantName}`}
                  className="w-full rounded-md shadow-md border border-slate-300 object-contain"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              disabled={isMinting}
            >
              Batalkan
            </Button>
            <Button
              onClick={handleMintOneByOne}
              disabled={isMinting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" /> Mint Satu per Satu ({previewImages.length}x Tx)
                </>
              )}
            </Button>
            <Button
              onClick={handleMint}
              disabled={isMinting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" /> Batch Mint (1x Tx)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default function MintPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <MintPageInner />
    </Suspense>
  );
}
