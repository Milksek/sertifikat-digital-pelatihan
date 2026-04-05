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
} from "@/components/ui/dialog";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  BookOpen,
  Calendar,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";
const globalAssessmentsCache: Record<string, any[]> = {};
export default function ParticipantAssessments() {
  const { user } = useAuth();
  const cacheKey = user?.id || "guest";
  const [assessments, setAssessments] = useState<any[]>(
    globalAssessmentsCache[cacheKey] || [],
  );
  const [loading, setLoading] = useState(!globalAssessmentsCache[cacheKey]);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(
    null,
  );
  useEffect(() => {
    async function fetchAssessments() {
      if (!user) {
        setLoading(false);
        return;
      }
      const key = user.id;
      if (!globalAssessmentsCache[key]) {
        setLoading(true);
      }
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select(
            `
            id,
            status,
            score,
            recommendation,
            created_at,
            evaluated_at,
            approved_at,
            competency_schemes(name, criteria),
            assessor:profiles!assessor_id(full_name)
          `,
          )
          .eq("participant_id", key)
          .order("created_at", { ascending: false });
        if (error) console.error("Participant assessment fetch error:", error);
        if (data) {
          setAssessments(data);
          globalAssessmentsCache[key] = data;
        }
      } catch (e) {
        console.error("Fetch Exception Assessments:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAssessments();
  }, [user]);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Lulus
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1.5 font-medium">
            <XCircle className="w-3 h-3" /> Tidak Lulus
          </Badge>
        );
      case "evaluated":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 gap-1.5 font-medium">
            <Clock className="w-3 h-3" /> Menunggu Persetujuan
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1.5 font-medium">
            <Clock className="w-3 h-3" /> Sedang Dinilai
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="gap-1.5 font-medium text-slate-600"
          >
            <Clock className="w-3 h-3" /> Terdaftar
          </Badge>
        );
    }
  };
  const getResultBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Kompeten
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1.5">
            <XCircle className="w-3 h-3" /> Belum Kompeten
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-slate-500 gap-1.5">
            <Clock className="w-3 h-3" /> Menunggu Hasil
          </Badge>
        );
    }
  };
  const getScoreTotal = (score: unknown) => {
    if (!score || !Array.isArray(score)) return null;
    const total = score.reduce(
      (sum: number, s: any) => sum + (s.score || 0),
      0,
    );
    const max = score.reduce(
      (sum: number, s: any) => sum + (s.maxScore || 0),
      0,
    );
    return max > 0 ? `${total} / ${max}` : null;
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Penilaian Saya
          </h1>
          <p className="text-slate-500 mt-1">
            Lihat status dan hasil uji kompetensi Anda.
          </p>
        </div>
        <Link href="/participant/schemes">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            Daftar Baru <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                Skema
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Tanggal Daftar
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Status
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Hasil
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <TableRow key={idx}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <ClipboardList className="w-10 h-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">
                      Belum ada riwayat assessment.
                    </p>
                    <Link href="/participant/schemes">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 mt-2"
                      >
                        Daftar Assessment
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((a: any) => (
                <TableRow key={a.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-medium text-slate-900">
                    {a.competency_schemes?.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-normal">
                    {a.competency_schemes?.criteria?.kode ||
                      `SKKNI-${a.id.slice(0, 8).toUpperCase()}`}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {format(new Date(a.created_at), "dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </TableCell>
                  <TableCell>{getStatusBadge(a.status)}</TableCell>
                  <TableCell>{getResultBadge(a.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 hover:bg-slate-100"
                      onClick={() => setSelectedAssessment(a)}
                    >
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={!!selectedAssessment}
        onOpenChange={() => setSelectedAssessment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Detail Assessment
            </DialogTitle>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-5 pt-1">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                    Status
                  </p>
                  {getStatusBadge(selectedAssessment.status)}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                    Hasil
                  </p>
                  {getResultBadge(selectedAssessment.status)}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">
                    Skema Kompetensi
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedAssessment.competency_schemes?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">
                    Asesor
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedAssessment.assessor?.full_name || (
                      <span className="text-slate-400 font-normal italic">
                        Belum ditugaskan
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">
                    Tanggal
                  </p>
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">Daftar:</span>{" "}
                    {format(
                      new Date(selectedAssessment.created_at),
                      "dd MMMM yyyy",
                      { locale: idLocale },
                    )}
                  </p>
                  {selectedAssessment.evaluated_at && (
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Dievaluasi:</span>{" "}
                      {format(
                        new Date(selectedAssessment.evaluated_at),
                        "dd MMMM yyyy",
                        { locale: idLocale },
                      )}
                    </p>
                  )}
                </div>
              </div>
              {getScoreTotal(selectedAssessment.score) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-0.5">
                      Total Skor
                    </p>
                    <p className="text-sm font-bold text-slate-800 text-lg">
                      {getScoreTotal(selectedAssessment.score)}
                    </p>
                  </div>
                </div>
              )}
              {selectedAssessment.recommendation && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">
                    Rekomendasi Asesor
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedAssessment.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
