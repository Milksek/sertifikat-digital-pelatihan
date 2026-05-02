"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { DetailPageSkeleton } from "@/components/ui/page-skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  User,
  BookOpen,
  ClipboardList,
  Award,
  FileText,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const score = value ?? 0;
  const color =
    score >= 75
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-yellow-400"
        : "bg-red-400";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 font-medium capitalize">{label}</span>
        <span className={`font-bold ${score >= 75 ? "text-emerald-600" : score >= 60 ? "text-yellow-600" : "text-red-500"}`}>
          {value !== null ? value : "—"}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function ParticipantAssessmentDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchAssessment() {
      if (!user || !id) return;
      const { data, error } = await supabase
        .from("assessments")
        .select(
          `*, competency_schemes(name, criteria), 
          assessor:profiles!assessor_id(full_name),
          certificates(certificate_number, token_id, tx_hash, status)`
        )
        .eq("id", id)
        .eq("participant_id", user.id)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setAssessment(data);
      }
      setLoading(false);
    }
    fetchAssessment();
  }, [user, id]);

  if (loading) return <DetailPageSkeleton sections={4} />;

  if (notFound) {
    return (
      <ErrorState
        variant="not-found"
        title="Assessment Tidak Ditemukan"
        description="Data tidak ditemukan atau Anda tidak memiliki akses ke assessment ini."
        backHref="/participant/assessments"
        backLabel="Daftar Assessment"
      />
    );
  }

  const score = assessment.score as Record<string, number> | null;
  const avg =
    score?.teori != null && score?.praktik != null && score?.wawancara != null
      ? Number(((score.teori + score.praktik + score.wawancara) / 3).toFixed(2))
      : null;

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Menunggu Penilaian", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
    in_progress: { label: "Sedang Dinilai", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
    evaluated: { label: "Selesai Dinilai", color: "bg-purple-100 text-purple-700 border-purple-200", icon: ClipboardList },
    approved: { label: "Disetujui Admin", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    rejected: { label: "Tidak Lulus", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  };

  const cfg = statusConfig[assessment.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;
  const scheme = assessment.competency_schemes;
  const assessor = assessment.assessor;
  const cert = Array.isArray(assessment.certificates)
    ? assessment.certificates[0]
    : assessment.certificates;

  const rec = assessment.recommendation as string | null;
  const isKompeten = rec?.startsWith("Kompeten");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Detail Hasil Assessment
        </h1>
        <p className="text-slate-500 text-sm mt-1">{scheme?.name}</p>
      </div>

      {}
      <div className={`flex items-center gap-3 p-4 rounded-2xl border ${cfg.color}`}>
        <StatusIcon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-sm">{cfg.label}</p>
          {assessment.evaluated_at && (
            <p className="text-xs opacity-75 mt-0.5">
              Dievaluasi: {format(new Date(assessment.evaluated_at), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
            </p>
          )}
        </div>
      </div>

      {}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Asesor
        </h3>
        <p className="font-semibold text-slate-800">
          {assessor?.full_name || "Belum ditugaskan"}
        </p>
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          Skema: <span className="font-medium text-slate-700">{scheme?.name}</span>
        </div>
        <p className="text-xs text-slate-400">
          Terdaftar: {format(new Date(assessment.created_at), "dd MMMM yyyy", { locale: idLocale })}
        </p>
      </div>

      {}
      {score ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Nilai Penilaian
          </h3>
          <div className="space-y-4">
            <ScoreBar label="Teori" value={score.teori ?? null} />
            <ScoreBar label="Praktik" value={score.praktik ?? null} />
            <ScoreBar label="Wawancara" value={score.wawancara ?? null} />
          </div>
          {avg !== null && (
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${avg >= 70 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <span className="text-sm font-semibold text-slate-700">Nilai Rata-rata</span>
              <span className={`text-3xl font-extrabold ${avg >= 70 ? "text-emerald-700" : "text-red-600"}`}>
                {avg}
              </span>
            </div>
          )}
        </div>
      ) : (
        assessment.status === "pending" || assessment.status === "in_progress" ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Nilai belum tersedia. Asesor sedang mengevaluasi assessment Anda.
            </p>
          </div>
        ) : null
      )}

      {}
      {rec && (
        <div className={`bg-white rounded-2xl border shadow-sm p-5 space-y-2 ${isKompeten ? "border-emerald-100" : "border-red-100"}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Rekomendasi Asesor
          </h3>
          <Badge className={isKompeten ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
            {isKompeten ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
            {rec.split(" - ")[0]}
          </Badge>
          {rec.includes(" - ") && (
            <p className="text-sm text-slate-600">{rec.split(" - ").slice(1).join(" - ")}</p>
          )}
          {assessment.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 mb-1">Catatan Asesor</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{assessment.notes}</p>
            </div>
          )}
        </div>
      )}

      {}
      {cert && cert.status === "active" && (
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-200" />
            <h3 className="font-semibold">Sertifikat NFT Diterbitkan!</h3>
          </div>
          <p className="text-xs text-blue-200 font-mono">{cert.certificate_number}</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/participant/certificates">
              <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 gap-1.5">
                <Award className="w-3.5 h-3.5" /> Lihat Sertifikat
              </Button>
            </Link>
            <Link href={`/verify?cert=${cert.certificate_number}`} target="_blank">
              <Button size="sm" variant="outline" className="border-blue-400 text-white hover:bg-blue-700 gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Verifikasi
              </Button>
            </Link>
          </div>
        </div>
      )}

      {}
      {Array.isArray(assessment.portfolio_files) && assessment.portfolio_files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Dokumen yang Anda Upload
          </h3>
          <div className="space-y-2">
            {(assessment.portfolio_files as string[]).map((url: string, i: number) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                Dokumen {i + 1}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
