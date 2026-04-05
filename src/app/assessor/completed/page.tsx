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
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
const globalCompletedCaches: Record<string, Record<string, any[]>> = {};
export default function AssessorCompletedEvaluations() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const cacheKey = user?.id || "guest";
  const [assessments, setAssessments] = useState<any[]>(
    globalCompletedCaches[cacheKey]?.[filter] || [],
  );
  const [loading, setLoading] = useState(
    !globalCompletedCaches[cacheKey]?.[filter],
  );
  useEffect(() => {
    async function fetchAssessments() {
      if (!user) {
        setLoading(false);
        return;
      }
      const key = user.id;
      if (!globalCompletedCaches[key]?.[filter]) {
        setLoading(true);
      }
      try {
        let query = supabase
          .from("assessments")
          .select(
            `
            id,
            status,
            recommendation,
            score,
            evaluated_at,
            competency_schemes(name),
            profiles!participant_id(full_name, nik)
          `,
          )
          .eq("assessor_id", user.id)
          .not("status", "in", '("pending","in_progress")')
          .order("evaluated_at", { ascending: false });
        if (filter === "kompeten") {
          query = query.like("recommendation", "Kompeten%");
        } else if (filter === "belum_kompeten") {
          query = query.like("recommendation", "Belum Kompeten%");
        } else if (filter === "remedial") {
          query = query.like("recommendation", "Perlu Remedial%");
        }
        const { data, error } = await query;
        if (error) console.error("Error fetching completed assessments", error);
        if (data) {
          setAssessments(data);
          if (!globalCompletedCaches[key]) globalCompletedCaches[key] = {};
          globalCompletedCaches[key][filter] = data;
        }
      } catch (e) {
        console.error("Fetch Exception:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAssessments();
  }, [user, filter]);
  const getResultBadge = (rec: string | null) => {
    if (!rec)
      return (
        <Badge variant="outline" className="text-slate-500">
          —
        </Badge>
      );
    if (rec.startsWith("Kompeten"))
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5">
          <CheckCircle2 className="w-3 h-3" /> Kompeten
        </Badge>
      );
    if (rec.startsWith("Perlu Remedial"))
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 gap-1.5">
          <RotateCcw className="w-3 h-3" /> Perlu Remedial
        </Badge>
      );
    if (rec.startsWith("Belum Kompeten"))
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1.5">
          <XCircle className="w-3 h-3" /> Belum Kompeten
        </Badge>
      );
    return <Badge variant="secondary">{rec.split(" -")[0]}</Badge>;
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
            <CheckCircle2 className="w-3 h-3" /> Disetujui Admin
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" /> Ditolak Admin
          </Badge>
        );
      case "evaluated":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1">
            <Clock className="w-3 h-3" /> Menunggu Review
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const getAvgScore = (score: unknown) => {
    if (!score || typeof score !== "object") return null;
    const teori = score.teori ?? null;
    const praktik = score.praktik ?? null;
    if (teori === null || praktik === null) return null;
    return Math.round((Number(teori) + Number(praktik)) / 2);
  };
  const filterOptions = [
    { value: "all", label: "Semua Hasil" },
    { value: "kompeten", label: "Kompeten" },
    { value: "remedial", label: "Perlu Remedial" },
    { value: "belum_kompeten", label: "Belum Kompeten" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Riwayat Penilaian
          </h1>
          <p className="text-slate-500 mt-1">
            Hasil evaluasi yang sudah Anda submit.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v);
            }}
          >
            <SelectTrigger className="bg-white border-slate-200">
              <SelectValue placeholder="Filter Hasil" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {assessments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Kompeten",
              count: assessments.filter((a) =>
                a.recommendation?.startsWith("Kompeten"),
              ).length,
              color: "bg-emerald-100 text-emerald-700",
            },
            {
              label: "Perlu Remedial",
              count: assessments.filter((a) =>
                a.recommendation?.startsWith("Perlu Remedial"),
              ).length,
              color: "bg-yellow-100 text-yellow-700",
            },
            {
              label: "Belum Kompeten",
              count: assessments.filter((a) =>
                a.recommendation?.startsWith("Belum Kompeten"),
              ).length,
              color: "bg-red-100 text-red-700",
            },
          ].map((s) => (
            <span
              key={s.label}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${s.color}`}
            >
              {s.label}: {s.count}
            </span>
          ))}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                Kandidat
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Skema
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Tanggal Evaluasi
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Avg Nilai
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Hasil
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
                  <div className="flex flex-col items-center justify-center gap-3">
                    <ClipboardList className="w-10 h-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">
                      {filter !== "all"
                        ? `Tidak ada hasil dengan filter "${filterOptions.find((o) => o.value === filter)?.label}".`
                        : "Belum ada riwayat penilaian."}
                    </p>
                    {filter !== "all" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilter("all")}
                      >
                        Lihat semua
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((a) => {
                const avg = getAvgScore(a.score);
                return (
                  <TableRow key={a.id} className="hover:bg-slate-50/60">
                    <TableCell>
                      <p className="font-semibold text-slate-800">
                        {(a.profiles as any)?.full_name || "—"}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        NIK: {(a.profiles as any)?.nik || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-[180px]">
                      <span className="line-clamp-2 text-sm">
                        {(a.competency_schemes as any)?.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap text-sm">
                      {a.evaluated_at
                        ? format(new Date(a.evaluated_at), "dd MMM yyyy", {
                            locale: idLocale,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {avg !== null ? (
                        <span
                          className={`text-sm font-bold ${avg >= 70 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {avg}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getResultBadge(a.recommendation)}</TableCell>
                    <TableCell>{getStatusBadge(a.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 hover:bg-slate-100 gap-1.5"
                        onClick={() =>
                          router.push(`/assessor/evaluate/${a.id}`)
                        }
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
