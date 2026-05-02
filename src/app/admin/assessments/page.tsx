"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Eye,
  XCircle,
  Award,
  ClipboardList,
  Wallet,
  User,
  BookOpen,
  PenLine,
  ShieldCheck,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
interface AssessorProfile {
  full_name: string;
}
interface ParticipantProfile {
  full_name: string;
}
interface CompetencyScheme {
  name: string;
}
interface AssessmentRecord {
  id: string;
  status: string;
  created_at: string;
  evaluated_at?: string | null;
  signature?: string | null;
  score?: Record<string, number> | null;
  recommendation?: string | null;
  notes?: string | null;
  portfolio_files?: string[] | null;
  assessor_id?: string | null;
  participant_id?: string;
  scheme_id?: string;
  competency_schemes?: CompetencyScheme | CompetencyScheme[] | unknown;
  profiles?: ParticipantProfile | ParticipantProfile[] | unknown;
  profiles_participant?: ParticipantProfile | ParticipantProfile[] | unknown;
  profiles_assessor?: AssessorProfile | AssessorProfile[] | unknown;
  assessor?: AssessorProfile | AssessorProfile[] | unknown;
  [key: string]: unknown;
}
const globalCachedAssessments: Record<string, AssessmentRecord[]> = {};
export default function AdminAssessments() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("evaluated");
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(
    globalCachedAssessments[filter] || [],
  );
  const [loading, setLoading] = useState(!globalCachedAssessments[filter]);
  const [selected, setSelected] = useState<AssessmentRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fetchAssessments = async () => {
    if (!globalCachedAssessments[filter]) {
      setLoading(true);
    }
    try {
      let query = supabase
        .from("assessments")
        .select(
          `
          id, status, recommendation, score, evaluated_at, created_at, signature, portfolio_files,
          competency_schemes(name, criteria),
          profiles!participant_id(full_name, wallet_address, nik),
          assessor:profiles!assessor_id(full_name, wallet_address)
        `,
        )
        .order("evaluated_at", { ascending: false });
      if (filter === "all") {
      } else if (filter === "evaluated") {
        query = query.eq("status", "evaluated");
      } else if (filter === "approved") {
        query = query.eq("status", "approved");
      } else if (filter === "rejected") {
        query = query.eq("status", "rejected");
      }
      const { data, error } = await query;
      if (error) {
        console.error("Supabase Error fetching assessments:", error);
      }
      if (data) {
        setAssessments(data as AssessmentRecord[]);
        globalCachedAssessments[filter] = data as AssessmentRecord[];
      }
    } catch (e) {
      console.error("Fetch Exception Assessments:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAssessments();
  }, [filter]);
  const handleApprove = async (a: any) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from("assessments")
        .update({ status: "approved" })
        .eq("id", a.id);
      if (error) throw error;
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user?.id,
          action: "assessment_approved",
          details: `Assessment ID ${a.id} disetujui — siap mint sertifikat`,
        })
        .maybeSingle();
      toast.success("Assessment disetujui! Lanjutkan ke halaman Mint NFT.");
      setDetailOpen(false);
      fetchAssessments();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyetujui");
    } finally {
      setProcessing(false);
    }
  };
  const handleReject = async (a: any) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from("assessments")
        .update({ status: "rejected" })
        .eq("id", a.id);
      if (error) throw error;
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user?.id,
          action: "assessment_rejected",
          details: `Assessment ID ${a.id} ditolak`,
        })
        .maybeSingle();
      toast.success("Assessment ditolak.");
      setDetailOpen(false);
      fetchAssessments();
    } catch (e: any) {
      toast.error(e.message || "Gagal menolak");
    } finally {
      setProcessing(false);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
            <ShieldCheck className="w-3 h-3" /> Disetujui
          </Badge>
        );
      case "evaluated":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
            <PenLine className="w-3 h-3" /> Menunggu Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
            <XCircle className="w-3 h-3" /> Ditolak
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Dalam Proses
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-500">
            Terdaftar
          </Badge>
        );
    }
  };
  const getRecBadge = (rec: string | null) => {
    if (!rec) return <span className="text-slate-400">—</span>;
    const label = rec.split(" - ")[0];
    if (label.startsWith("Kompeten"))
      return <span className="font-semibold text-emerald-600">{label}</span>;
    if (label.startsWith("Perlu Remedial"))
      return <span className="font-semibold text-yellow-600">{label}</span>;
    return <span className="font-semibold text-red-600">{label}</span>;
  };
  const getAvg = (score: any) => {
    if (!score) return null;
    const t = score.teori ?? null;
    const p = score.praktik ?? null;
    const w = score.wawancara ?? null;
    if (t === null || p === null || w === null) return null;
    return Number(((Number(t) + Number(p) + Number(w)) / 3).toFixed(2));
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Review Assessment
          </h1>
          <p className="text-slate-500 mt-1">
            Tinjau hasil evaluasi asesor dan buat keputusan penerbitan
            sertifikat.
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 bg-white border-slate-200">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="evaluated">Menunggu Review</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                Peserta
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Skema
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Asesor
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Nilai (Avg)
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Rekomendasi
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
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-500">
                      Tidak ada assessment yang menunggu review.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((a) => {
                const avg = getAvg(a.score);
                return (
                  <TableRow key={a.id} className="hover:bg-slate-50/60">
                    <TableCell>
                      <p className="font-semibold text-slate-800">
                        {(a.profiles as any)?.full_name || "—"}
                      </p>
                      <p className="font-mono text-xs text-slate-400">
                        {(a.profiles as any)?.nik || ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[160px]">
                      <span className="line-clamp-2">
                        {(a.competency_schemes as any)?.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {(a.assessor as any)?.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      {avg !== null ? (
                        <span
                          className={`text-sm font-bold ${avg >= 70 ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {avg}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getRecBadge(a.recommendation || null)}
                    </TableCell>
                    <TableCell>{getStatusBadge(a.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 h-7 text-xs gap-1"
                        onClick={() => {
                          setSelected(a);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" /> Detail
              Penilaian
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Peserta
                </h4>
                <p className="font-bold text-slate-800">
                  {(selected.profiles as any)?.full_name}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">NIK:</span>{" "}
                    <span className="font-medium">
                      {(selected.profiles as any)?.nik || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Skema:</span>{" "}
                    <span className="font-medium">
                      {(selected.competency_schemes as any)?.name}
                    </span>
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-400 bg-white px-2 py-1.5 rounded border border-slate-200 break-all">
                  {(selected.profiles as any)?.wallet_address}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Asesor
                </h4>
                <p className="font-semibold text-slate-800">
                  {(selected.assessor as any)?.full_name || "—"}
                </p>
                {selected.evaluated_at && (
                  <p className="text-xs text-slate-400">
                    Dievaluasi:{" "}
                    {format(
                      new Date(selected.evaluated_at as string),
                      "dd MMMM yyyy, HH:mm",
                      { locale: idLocale },
                    )}
                  </p>
                )}
              </div>
              {selected.score && (
                <div className="grid grid-cols-4 gap-3">
                  {["teori", "praktik", "wawancara"].map((k) => (
                    <div
                      key={k}
                      className="text-center bg-slate-50 rounded-xl p-3"
                    >
                      <p className="text-xs text-slate-400 capitalize">{k}</p>
                      <p className="text-2xl font-extrabold text-slate-800">
                        {(selected.score as Record<string, number>)[k] ?? "—"}
                      </p>
                    </div>
                  ))}
                  <div className="text-center bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-xs text-blue-400">Rata-rata</p>
                    <p className="text-2xl font-extrabold text-blue-700">
                      {getAvg(selected.score) ?? "—"}
                    </p>
                  </div>
                </div>
              )}
              {selected.recommendation && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Rekomendasi Asesor
                  </h4>
                  <p className="font-semibold text-slate-800">
                    {String(selected.recommendation).split(" - ")[0]}
                  </p>
                  {String(selected.recommendation).includes(" - ") && (
                    <p className="text-sm text-slate-600 mt-1">
                      {String(selected.recommendation)
                        .split(" - ")
                        .slice(1)
                        .join(" - ")}
                    </p>
                  )}
                </div>
              )}
              {selected?.portfolio_files && Array.isArray(selected.portfolio_files) && selected.portfolio_files.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Dokumen Pendukung
                  </h4>
                  <div className="flex flex-col gap-2 mt-2">
                    {(selected.portfolio_files as string[]).map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                      >
                        <LinkIcon className="w-3.5 h-3.5" /> Lihat Dokumen {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {selected.signature && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <Wallet className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-green-700">
                      Ditandatangani Digital
                    </p>
                    <p className="font-mono text-xs text-green-600 break-all">
                      {selected.signature.slice(0, 40)}...
                    </p>
                  </div>
                </div>
              )}
              {(selected.status as string) === "evaluated" && (
                <div className="space-y-3 mt-2">
                  <div className="text-xs text-slate-500 text-center">
                    Pilih keputusan untuk penilaian ini:
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const isKompeten =
                        typeof selected.recommendation === "string" &&
                        selected.recommendation.startsWith("Kompeten");
                      return (
                        <Button
                          className={`gap-2 ${isKompeten ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-300 text-slate-500 cursor-not-allowed hover:bg-slate-300"}`}
                          disabled={processing || !isKompeten}
                          onClick={() => handleApprove(selected)}
                          title={
                            !isKompeten
                              ? "Sertifikat hanya dapat diterbitkan untuk peserta yang direkomendasikan Kompeten."
                              : ""
                          }
                        >
                          <Award className="w-4 h-4" />
                          {processing ? "Memproses..." : "Lulus"}
                        </Button>
                      );
                    })()}
                    <Button
                      variant="destructive"
                      className="gap-2"
                      disabled={processing}
                      onClick={() => handleReject(selected)}
                    >
                      <XCircle className="w-4 h-4" />
                      {processing ? "Memproses..." : "Tidak Lulus"}
                    </Button>
                  </div>
                  {selected.status === "approved" && (
                    <Link href={`/admin/mint?assessment=${selected.id}`}>
                      <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                        <Award className="w-4 h-4" /> Lanjut ke Mint NFT
                      </Button>
                    </Link>
                  )}
                </div>
              )}
              {selected.status === "approved" && (
                <div className="mt-2">
                  <Link href={`/admin/mint?assessment=${selected.id}`}>
                    <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                      <Award className="w-4 h-4" /> Mint Sertifikat NFT
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
