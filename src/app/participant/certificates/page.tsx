"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Award,
  Eye,
  Download,
  Share2,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  XCircle,
  Copy,
  Layers,
  Link2,
} from "lucide-react";
import { resolveScheme } from "thirdweb/storage";
import { client } from "@/lib/thirdweb";
import { format, addYears } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
const globalCertsCache: Record<string, any[]> = {};
async function downloadCertAsPdf(
  cert: any,
  imageUrl: string,
  participantName: string,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  const imgType = blob.type.includes("png") ? "PNG" : "JPEG";
  const fitW = pageW - 10;
  const fitH = fitW * 0.707;
  const offsetX = (pageW - fitW) / 2;
  const offsetY = (pageH - fitH) / 2;
  pdf.addImage(base64, imgType, offsetX, offsetY, fitW, fitH);
  const safeName = (participantName || "sertifikat").replace(/\s+/g, "_");
  pdf.save(`${cert.certificate_number}_${safeName}.pdf`);
}
export default function ParticipantCertificates() {
  const { user } = useAuth();
  const cacheKey = user?.wallet_address || "guest";
  const [downloading, setDownloading] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<any[]>(
    globalCertsCache[cacheKey] || [],
  );
  const [loading, setLoading] = useState(!globalCertsCache[cacheKey]);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);
  useEffect(() => {
    async function fetchCertificates() {
      if (!user?.wallet_address) {
        setLoading(false);
        return;
      }
      const key = user.wallet_address;
      if (!globalCertsCache[key]) {
        setLoading(true);
      }
      try {
        const { data, error } = await supabase
          .from("certificates")
          .select(
            `            id,            certificate_number,            token_id,
            tx_hash,            ipfs_image_uri,            status,            minted_at,            competency_schemes(name, criteria),            assessments(              evaluated_at,              participant:profiles!participant_id(full_name, nik),              assessor:profiles!assessor_id(full_name)            )          `,
          )
          .eq("participant_wallet", key.toLowerCase())
          .order("minted_at", { ascending: false });
        if (error) console.error("Participant certificate fetch error:", error);
        if (data && data.length > 0) {
          try {
            const { readContract } = await import("thirdweb");
            const { certificateContract } = await import("@/lib/thirdweb");
            if (!certificateContract) throw new Error("SC Not Configured");
            const validationPromises = data.map(async (cert) => {
               try {
                 const owner = await readContract({
                   contract: certificateContract,
                   method: "function ownerOf(uint256 tokenId) view returns (address)",
                   params: [BigInt(cert.token_id)]
                 });
                 const sah = typeof owner === "string" && owner.toLowerCase() === key.toLowerCase();
                 return sah ? cert : null;
               } catch (err) {
                 return null; 
               }
            });
            const results = await Promise.all(validationPromises);
            const verifiedCerts = results.filter((r) => r !== null);
            setCertificates(verifiedCerts);
            globalCertsCache[key] = verifiedCerts;
          } catch(e) {
            console.warn("Fallback to DB data only", e);
            setCertificates(data);
            globalCertsCache[key] = data;
          }
        } else if (data) {
          setCertificates(data);
          globalCertsCache[key] = data;
        }
      } catch (e) {
        console.error("Fetch Exception Certificates:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCertificates();
  }, [user]);
  const getImageUrl = (ipfsUri: string) => {
    if (!ipfsUri) return "";
    return ipfsUri.replace("ipfs://", "https://ipfs.io/ipfs/");
  };
  const handleShare = (cert: any) => {
    const url = `${window.location.origin}/verify?cert=${cert.certificate_number}`;
    navigator.clipboard.writeText(url);
    toast.success("Tautan sertifikat berhasil disalin!");
  };
  const handleDownloadPDF = async (cert: any, participantName: string) => {
    if (!cert.ipfs_image_uri) {
      toast.error("Gambar sertifikat tidak tersedia.");
      return;
    }
    try {
      setDownloading(cert.id);
      const imageUrl = getImageUrl(cert.ipfs_image_uri);
      await downloadCertAsPdf(cert, imageUrl, participantName);
      toast.success("Sertifikat berhasil diunduh!");
    } catch {
      toast.error("Gagal mengunduh sertifikat. Coba lagi.");
    } finally {
      setDownloading(null);
    }
  };
  const handleCopyLink = (cert: any) => {
    const url = `${window.location.origin}/verify?cert=${cert.certificate_number}`;
    navigator.clipboard.writeText(url);
    toast.success("Link verifikasi disalin!");
  };
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {" "}
            Sertifikat NFT Saya{" "}
          </h1>{" "}
          <p className="text-slate-500 mt-1">
            {" "}
            NFT Soulbound resmi yang membuktikan kompetensi Anda.{" "}
          </p>{" "}
        </div>{" "}
        {certificates.length > 0 && (
          <Badge variant="secondary" className="font-medium">
            {" "}
            {certificates.length} sertifikat{" "}
          </Badge>
        )}{" "}
      </div>{" "}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {" "}
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              {" "}
              <Skeleton className="h-52 w-full rounded-none" />{" "}
              <CardHeader>
                {" "}
                <Skeleton className="h-5 w-20 mb-1" />{" "}
                <Skeleton className="h-6 w-3/4" />{" "}
                <Skeleton className="h-4 w-1/2 mt-1" />{" "}
              </CardHeader>{" "}
              <div className="p-6 pt-0">
                {" "}
                <Skeleton className="h-10 w-full mb-2" />{" "}
                <Skeleton className="h-9 w-full" />{" "}
              </div>{" "}
            </Card>
          ))}{" "}
        </div>
      ) : certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-200 text-center">
          {" "}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-5">
            {" "}
            <Award className="h-10 w-10 text-amber-500" />{" "}
          </div>{" "}
          <h3 className="text-xl font-semibold text-slate-800">
            {" "}
            Belum ada sertifikat{" "}
          </h3>{" "}
          <p className="text-slate-500 mt-2 max-w-xs text-sm">
            {" "}
            Selesaikan uji kompetensi dan dapatkan sertifikat NFT pertama
            Anda.{" "}
          </p>{" "}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {" "}
          {certificates.map((cert) => {
            const assessment = Array.isArray(cert.assessments)
              ? cert.assessments[0]
              : cert.assessments;
            const participantName =
              assessment?.participant?.full_name || user?.full_name;
            const participantNik = assessment?.participant?.nik || "-";
            const assessorName = assessment?.assessor?.full_name || "-";
            const evaluatedAt = assessment?.evaluated_at
              ? format(new Date(assessment.evaluated_at), "dd MMM yyyy", {
                  locale: idLocale,
                })
              : "-";
            const mintedAt = cert.minted_at
              ? format(new Date(cert.minted_at), "dd MMM yyyy", {
                  locale: idLocale,
                })
              : "-";
            const expiryDate = cert.minted_at
              ? format(addYears(new Date(cert.minted_at), 3), "dd MMM yyyy", {
                  locale: idLocale,
                })
              : "-";
            const verifyUrl = `${origin || "https://kompeten-id.vercel.app"}/verify?cert=${cert.certificate_number}`;
            const criteriaList: unknown[] = Array.isArray(
              cert.competency_schemes?.criteria,
            )
              ? cert.competency_schemes.criteria
              : [];
            const isActive = cert.status === "active";
            return (
              <Card
                key={cert.id}
                className="overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 border-slate-200 bg-white group"
              >
                {" "}
                <div className="aspect-[4/3] w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden border-b border-slate-200 relative">
                  {" "}
                  {cert.ipfs_image_uri ? (
                    <img
                      src={getImageUrl(cert.ipfs_image_uri)}
                      alt={cert.competency_schemes?.name}
                      className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-300">
                      {" "}
                      <Award className="h-16 w-16" />{" "}
                      <span className="text-xs font-medium uppercase tracking-wider">
                        {" "}
                        NFT Certificate{" "}
                      </span>{" "}
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {isActive ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 shadow-md gap-1 px-3 py-1">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="shadow-md gap-1 px-3 py-1"
                      >
                        <XCircle className="w-3 h-3" /> Dicabut
                      </Badge>
                    )}
                  </div>
                </div>
                <CardHeader className="pb-3">
                  <div className="text-xs font-semibold text-blue-600 tracking-wider uppercase mb-1">
                    {mintedAt}
                  </div>
                  <CardTitle className="text-base leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                    {cert.competency_schemes?.name}
                  </CardTitle>
                  <CardDescription className="font-mono mt-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded inline-block">
                    {cert.certificate_number}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 gap-2 flex-col mt-auto">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2">
                        <Eye className="w-4 h-4" /> Lihat Detail
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl p-0 overflow-hidden bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible">
                        <div className="bg-gradient-to-b from-slate-900 to-slate-800 p-6 flex flex-col items-center justify-center text-white gap-5">
                          {cert.ipfs_image_uri ? (
                            <img
                              src={getImageUrl(cert.ipfs_image_uri)}
                              alt={cert.competency_schemes?.name}
                              className="w-full rounded-xl shadow-2xl border border-white/10"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-slate-700 rounded-xl flex justify-center items-center">
                              <Award className="w-20 h-20 text-slate-500" />
                            </div>
                          )}
                          <div className="bg-white p-2.5 rounded-xl shadow-lg">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(verifyUrl)}&margin=8`}
                              alt="QR Code"
                              className="w-32 h-32"
                            />
                          </div>
                          <p className="text-xs text-slate-400 text-center">
                            Scan untuk verifikasi
                          </p>
                        </div>
                        <div className="p-6 flex flex-col gap-1 bg-white overflow-y-auto">
                          <DialogHeader className="mb-4">
                            <Badge
                              className={
                                isActive
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 w-fit gap-1"
                                  : "bg-red-100 text-red-700 border-red-200 w-fit gap-1"
                              }
                            >
                              {isActive ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />{" "}
                                  SERTIFIKAT VALID
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" /> SERTIFIKAT
                                  DICABUT
                                </>
                              )}
                            </Badge>
                            <DialogTitle className="text-lg font-bold text-slate-900 mt-3 leading-snug">
                              {cert.competency_schemes?.name}
                            </DialogTitle>
                            <p className="font-mono text-sm text-blue-600 font-medium">
                              {cert.certificate_number}
                            </p>
                          </DialogHeader>
                          <div className="space-y-4 flex-1">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-medium mb-0.5 uppercase tracking-wider">
                                  Nama Peserta
                                </p>
                                <p className="text-sm font-semibold text-slate-800">
                                  {participantName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  NIK: {participantNik}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-medium mb-0.5 uppercase tracking-wider">
                                  Asesor
                                </p>
                                <p className="text-sm font-semibold text-slate-800">
                                  {assessorName}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-medium mb-0.5 uppercase tracking-wider">
                                  Validitas
                                </p>
                                <p className="text-xs text-slate-600">
                                  Tanggal Uji:{" "}
                                  <span className="font-medium">
                                    {evaluatedAt}
                                  </span>
                                </p>
                                <p className="text-xs text-slate-600">
                                  Terbit:{" "}
                                  <span className="font-medium">
                                    {mintedAt}
                                  </span>
                                </p>
                                <p className="text-xs text-slate-600">
                                  Berlaku s/d:{" "}
                                  <span className="font-semibold text-emerald-700">
                                    {expiryDate}
                                  </span>
                                </p>
                              </div>
                            </div>
                            {criteriaList.length > 0 && (
                              <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
                                    Unit Kompetensi ({criteriaList.length})
                                  </p>
                                  <div className="space-y-1">
                                    {criteriaList
                                      .slice(0, 4)
                                      .map((c: any, idx: number) => (
                                        <p
                                          key={idx}
                                          className="text-xs text-slate-600 flex gap-1.5"
                                        >
                                          <span className="text-slate-400 font-mono flex-shrink-0">
                                            {(idx + 1)
                                              .toString()
                                              .padStart(2, "0")}
                                            .
                                          </span>
                                          {c.name}
                                        </p>
                                      ))}
                                    {criteriaList.length > 4 && (
                                      <p className="text-xs text-slate-400 italic">
                                        +{criteriaList.length - 4} unit lainnya
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 font-medium mb-0.5 uppercase tracking-wider">
                                  Skema Kompetensi
                                </p>
                                <p className="text-sm text-slate-700">
                                  {cert.competency_schemes?.name}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="pt-5 mt-4 border-t border-slate-100 space-y-2">
                            <Button
                              asChild
                              className="w-full bg-blue-600 hover:bg-blue-700 gap-2 cursor-pointer"
                            >
                              <a
                                href={verifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Link2 className="w-4 h-4" /> Verifikasi Online /
                                Blockchain
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full border-slate-200 text-slate-600 gap-2 cursor-pointer"
                              onClick={() => handleCopyLink(cert)}
                            >
                              <Copy className="w-4 h-4" /> Salin Link Verifikasi
                            </Button>
                            {cert.tx_hash && (
                              <Button
                                asChild
                                variant="outline"
                                className="w-full border-slate-200 text-slate-600 gap-2 cursor-pointer"
                              >
                                <a
                                  href={`https://amoy.polygonscan.com/tx/${cert.tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Lihat di Polygonscan{" "}
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="outline"
                      className="text-slate-600 bg-white border-slate-200 hover:bg-slate-50 gap-1.5"
                      disabled={downloading === cert.id || !cert.ipfs_image_uri}
                      onClick={() =>
                        handleDownloadPDF(cert, participantName || "")
                      }
                    >
                      {downloading === cert.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          Mengunduh...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> Unduh PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 gap-1.5"
                      onClick={() => handleShare(cert)}
                    >
                      <Share2 className="w-3.5 h-3.5" /> Bagikan
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
