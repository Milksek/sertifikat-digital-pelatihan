"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { DetailPageSkeleton } from "@/components/ui/page-skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Wallet,
  User,
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  PenLine,
  AlertCircle,
  FileUp,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
const RECOMMENDATIONS = [
  {
    value: "Kompeten",
    label: "Kompeten",
    desc: "Peserta memenuhi seluruh standar kompetensi",
    icon: CheckCircle2,
    color: "border-emerald-400 bg-emerald-50 text-emerald-800",
    activeColor: "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400",
    iconColor: "text-emerald-600",
    lockedColor: "border-slate-200 bg-slate-50 text-slate-400",
  },
  {
    value: "Perlu Remedial",
    label: "Perlu Remedial",
    desc: "Peserta memerlukan perbaikan pada aspek tertentu",
    icon: RotateCcw,
    color: "border-yellow-300 bg-yellow-50 text-yellow-800",
    activeColor: "border-yellow-500 bg-yellow-100 ring-2 ring-yellow-400",
    iconColor: "text-yellow-600",
    lockedColor: "border-slate-200 bg-slate-50 text-slate-400",
  },
  {
    value: "Belum Kompeten",
    label: "Belum Kompeten",
    desc: "Peserta belum memenuhi standar kompetensi",
    icon: XCircle,
    color: "border-red-300 bg-red-50 text-red-800",
    activeColor: "border-red-500 bg-red-100 ring-2 ring-red-400",
    iconColor: "text-red-500",
    lockedColor: "border-slate-200 bg-slate-50 text-slate-400",
  },
];
export default function EvaluatePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const account = useActiveAccount();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teori, setTeori] = useState<number | "">(85);
  const [praktik, setPraktik] = useState<number | "">(90);
  const [wawancara, setWawancara] = useState<number | "">(88);
  const [recommendation, setRecommendation] = useState<string>("Kompeten");
  const [notes, setNotes] = useState<string>("Peserta menunjukkan pemahaman yang sangat baik pada materi teori dan mampu mengaplikasikan keterampilan praktis sesuai standar yang ditetapkan.");

  useEffect(() => {
    async function fetchAssessment() {
      const { data } = await supabase
        .from("assessments")
        .select(
          `*, competency_schemes(name, criteria), profiles!participant_id(full_name, wallet_address, nik, email)`,
        )
        .eq("id", id)
        .single();
      if (data) {
        setAssessment(data);
        if (data.score) {
          setTeori(data.score.teori ?? "");
          setPraktik(data.score.praktik ?? "");
          setWawancara(data.score.wawancara ?? "");
        }
        if (data.recommendation) {
          const rec = data.recommendation.split(" - ")[0];
          setRecommendation(rec || "Kompeten");
          const note = data.recommendation.split(" - ").slice(1).join(" - ");
          setNotes(note || "");
        }
      }
      setLoading(false);
    }
    fetchAssessment();
  }, [id]);
  const handleSubmit = async () => {
    if (!account) {
      toast.error("Harap hubungkan wallet untuk menandatangani evaluasi");
      return;
    }
    if (teori === "" || praktik === "" || wawancara === "") {
      toast.error("Nilai Teori, Praktik, dan Wawancara harus diisi");
      return;
    }
    try {
      setSubmitting(true);

      const evalData = JSON.stringify({
        assessmentId: id,
        scores: { teori, praktik, wawancara },
        recommendation,
        notes,
        assessorId: user?.id,
        timestamp: new Date().toISOString(),
      });
      const signature = await account.signMessage({ message: evalData });
      const { error } = await supabase
        .from("assessments")
        .update({
          score: { teori, praktik, wawancara },
          recommendation: notes.trim() ? `${recommendation} - ${notes}` : recommendation,
          signature,
          assessor_id: user?.id,
          status: "evaluated",
          evaluated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Evaluasi berhasil dikirim dan ditandatangani!");
      router.push("/assessor/evaluations");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim evaluasi");
    } finally {
      setSubmitting(false);
    }
  };

  const teoriNum = Number(teori) || 0;
  const praktikNum = Number(praktik) || 0;
  const wawancaraNum = Number(wawancara) || 0;
  const avgScore =
    teori !== "" && praktik !== "" && wawancara !== ""
      ? Number(((teoriNum + praktikNum + wawancaraNum) / 3).toFixed(2))
      : null;

  useEffect(() => {
    const isAlreadyDone =
      assessment?.status === "evaluated" ||
      assessment?.status === "approved" ||
      assessment?.status === "rejected";
    if (isAlreadyDone || avgScore === null) return;
    if (avgScore >= 75) setRecommendation("Kompeten");
    else if (avgScore >= 60) setRecommendation("Perlu Remedial");
    else setRecommendation("Belum Kompeten");
  }, [avgScore]);

  if (loading) return <DetailPageSkeleton sections={5} />;
  if (!assessment) {
    return (
      <ErrorState
        variant="not-found"
        title="Penilaian Tidak Ditemukan"
        description="Data penilaian tidak ada atau sudah dihapus."
        backHref="/assessor/evaluations"
        backLabel="Kembali ke Daftar"
      />
    );
  }
  const isCompleted =
    assessment.status === "evaluated" ||
    assessment.status === "approved" ||
    assessment.status === "rejected";
  const criteriaList = Array.isArray(assessment.competency_schemes?.criteria)
    ? assessment.competency_schemes.criteria
    : [];

  const isRecAllowed = (recValue: string, avg: number | null): boolean => {
    if (avg === null) return true;
    if (avg >= 75) return recValue === "Kompeten";
    if (avg >= 60)
      return recValue === "Kompeten" || recValue === "Perlu Remedial";
    return recValue === "Belum Kompeten";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/assessor/evaluations")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Form Evaluasi Peserta
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {assessment.competency_schemes?.name}
          </p>
        </div>
        {isCompleted && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dievaluasi
          </Badge>
        )}
      </div>
      <Card className="border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Informasi Peserta
            (Read-only)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="p-4">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">
                Nama Lengkap
              </Label>
              <p className="font-semibold text-slate-800 mt-1">
                {assessment.profiles?.full_name || "—"}
              </p>
            </div>
            <div className="p-4">
              <Label className="text-xs text-slate-400 uppercase tracking-wider">
                NIK (KTP)
              </Label>
              <p className="font-semibold text-slate-800 mt-1">
                {assessment.profiles?.nik || "—"}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 p-4">
            <Label className="text-xs text-slate-400 uppercase tracking-wider">
              Alamat Wallet
            </Label>
            <p className="font-mono text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg mt-1 break-all">
              {assessment.profiles?.wallet_address || "—"}
            </p>
          </div>
          {criteriaList.length > 0 && (
            <div className="border-t border-slate-100 p-4">
              <Label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5" /> Unit Kompetensi (
                {criteriaList.length})
              </Label>
              <div className="space-y-1">
                {criteriaList.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <span className="font-mono text-xs text-slate-400 w-5">
                      {idx + 1}.
                    </span>
                    <span>{c.name}</span>
                    {c.maxScore && (
                      <span className="text-xs text-slate-400 ml-auto">
                        Max: {c.maxScore}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(assessment as any).portfolio_files &&
            (assessment as any).portfolio_files.length > 0 && (
              <div className="border-t border-slate-100 p-4">
                <Label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5" /> Portofolio / Dokumen
                  Bukti ({(assessment as any).portfolio_files.length})
                </Label>
                <div className="flex flex-col gap-2">
                  {(assessment as any).portfolio_files.map(
                    (fileUrl: string, idx: number) => (
                      <a
                        key={idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                      >
                        <LinkIcon className="w-3.5 h-3.5" /> Dokumen Portofolio{" "}
                        {idx + 1}
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <PenLine className="w-4 h-4 text-blue-600" /> Input Penilaian
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Nilai Teori{" "}
                <span className="text-slate-400 font-normal">(0 – 100)</span>
              </Label>
              <p className="text-xs text-slate-400">
                Pemahaman konsep dan teori kompetensi.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                value={teori}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const v = parseInt(raw, 10);
                  setTeori(raw === "" ? "" : Math.min(100, Math.max(0, v)));
                }}
                disabled={isCompleted}
                placeholder="0 – 100"
                className="text-lg font-bold text-center h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Nilai Praktik{" "}
                <span className="text-slate-400 font-normal">(0 – 100)</span>
              </Label>
              <p className="text-xs text-slate-400">
                Demonstrasi keterampilan langsung.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                value={praktik}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const v = parseInt(raw, 10);
                  setPraktik(raw === "" ? "" : Math.min(100, Math.max(0, v)));
                }}
                disabled={isCompleted}
                placeholder="0 – 100"
                className="text-lg font-bold text-center h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Nilai Wawancara{" "}
                <span className="text-slate-400 font-normal">(0 – 100)</span>
              </Label>
              <p className="text-xs text-slate-400">
                Evaluasi pendalaman secara lisan.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                value={wawancara}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const v = parseInt(raw, 10);
                  setWawancara(raw === "" ? "" : Math.min(100, Math.max(0, v)));
                }}
                disabled={isCompleted}
                placeholder="0 – 100"
                className="text-lg font-bold text-center h-12"
              />
            </div>
          </div>
          {avgScore !== null && (
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${avgScore >= 70 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
            >
              <span
                className={`text-sm font-medium ${avgScore >= 70 ? "text-emerald-700" : "text-red-700"}`}
              >
                Rata-rata Nilai
              </span>
              <span
                className={`text-2xl font-extrabold ${avgScore >= 70 ? "text-emerald-700" : "text-red-700"}`}
              >
                {avgScore}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Catatan Asesor
            </Label>
            <Textarea
              placeholder="Tuliskan catatan evaluasi, kekuatan peserta, dan area yang perlu diperbaiki..."
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(e.target.value)
              }
              disabled={isCompleted}
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700">
              Rekomendasi
            </Label>
            <div className="grid grid-cols-1 gap-3">
              {RECOMMENDATIONS.map((rec) => {
                const Icon = rec.icon;
                const isSelected = recommendation === rec.value;
                const isAllowed = isRecAllowed(rec.value, avgScore);
                const isLocked = isCompleted || !isAllowed;
                return (
                  <button
                    key={rec.value}
                    type="button"
                    disabled={isLocked}
                    onClick={() => !isLocked && setRecommendation(rec.value)}
                    title={
                      !isAllowed && avgScore !== null
                        ? avgScore >= 75
                          ? "Nilai sudah aman (≥75), hanya Kompeten yang dapat dipilih."
                          : avgScore >= 60
                            ? "Nilai pas-pasan (60–74), hanya Perlu Remedial yang dapat dipilih."
                            : "Nilai di bawah standar (<60), hanya Belum Kompeten yang dapat dipilih."
                        : undefined
                    }
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      isLocked && !isCompleted
                        ? rec.lockedColor + " opacity-40 cursor-not-allowed"
                        : isSelected
                          ? rec.activeColor
                          : rec.color
                    } ${isCompleted ? "opacity-60 cursor-not-allowed" : ""} ${
                      !isLocked && !isCompleted
                        ? "cursor-pointer hover:shadow-sm"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-current" : "border-current/40"}`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-current" />
                      )}
                    </div>
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isLocked && !isCompleted
                          ? "text-slate-300"
                          : rec.iconColor
                      }`}
                    />
                    <div>
                      <p className="font-semibold text-sm">{rec.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">{rec.desc}</p>
                      {!isAllowed && avgScore !== null && !isCompleted && (
                        <p className="text-xs text-slate-900 mt-1 italic">
                          Tidak tersedia untuk nilai ini
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      {!isCompleted ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <Wallet className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900">
                  Diperlukan Tanda Tangan Digital
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Dengan menekan tombol di bawah, Anda akan menandatangani
                  payload evaluasi secara kriptografi menggunakan wallet
                  MetaMask sebagai bukti identitas asesor yang tidak dapat
                  dipalsukan.
                </p>
              </div>
            </div>
            {!account && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3 text-sm text-yellow-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Wallet belum terhubung. Harap hubungkan MetaMask Anda.
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !account}
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menandatangani & Mengirim...
                </>
              ) : (
                <>
                  <PenLine className="w-4 h-4" /> Simpan Evaluasi dengan
                  MetaMask
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-emerald-900">
                  Evaluasi Telah Dikirim
                </h4>
                <p className="text-sm text-emerald-700 mt-1">
                  Evaluasi ini sudah ditandatangani dan menunggu persetujuan
                  admin.
                </p>
                {assessment.signature && (
                  <p className="text-xs text-emerald-600 font-mono mt-2 bg-emerald-100 px-3 py-2 rounded-lg truncate">
                    Sig: {assessment.signature}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
