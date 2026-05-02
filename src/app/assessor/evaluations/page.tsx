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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  Clock,
  Search,
  ClipboardList,
  User,
  Calendar,
  ArrowRight,
} from "lucide-react";
const globalAssessorEvalsCache: Record<string, any[]> = {};
export default function AssessorEvaluations() {
  const { user } = useAuth();
  const router = useRouter();
  const cacheKey = user?.id || "guest";
  const [assessments, setAssessments] = useState<any[]>(
    globalAssessorEvalsCache[cacheKey] || [],
  );
  const [loading, setLoading] = useState(!globalAssessorEvalsCache[cacheKey]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    async function fetchAssessments() {
      if (!user) {
        setLoading(false);
        return;
      }
      const key = user.id;
      if (!globalAssessorEvalsCache[key]) setLoading(true);
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select(
            `
            id,
            status,
            created_at,
            competency_schemes(name),
            profiles!participant_id(full_name, wallet_address, nik)
          `,
          )
          .eq("assessor_id", user.id)
          .in("status", ["pending", "in_progress"])
          .order("created_at", { ascending: true });
        if (error) console.error("Assessor evaluations fetch error:", error);
        if (data) {
          setAssessments(data);
          globalAssessorEvalsCache[key] = data;
        }
      } catch (e) {
        console.error("Fetch Exception:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAssessments();
  }, [user]);
  const filtered = assessments.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.profiles as any)?.full_name?.toLowerCase().includes(q) ||
      (a.competency_schemes as any)?.name?.toLowerCase().includes(q)
    );
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Peserta Menunggu
          </h1>
          <p className="text-slate-500 mt-1">
            Kandidat yang menunggu penilaian dan evaluasi Anda.
          </p>
        </div>
        {assessments.length > 0 && (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-medium self-start sm:self-auto px-3 py-1.5 text-sm">
            {assessments.length} menunggu
          </Badge>
        )}
      </div>
      {assessments.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama peserta atau skema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 focus:border-blue-400"
          />
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Nama Peserta
                </div>
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Skema
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Tanggal Daftar
                </div>
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
                  <TableCell>
                    <Skeleton className="h-4 w-[160px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[160px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[90px] rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <ClipboardList className="w-10 h-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">
                      {search
                        ? "Tidak ada hasil yang cocok."
                        : "Tidak ada peserta yang menunggu evaluasi."}
                    </p>
                    {search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearch("")}
                      >
                        Hapus pencarian
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id} className="hover:bg-slate-50/60">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {(a.profiles as any)?.full_name || "—"}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        NIK: {(a.profiles as any)?.nik || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 max-w-[200px]">
                    <span className="line-clamp-2">
                      {(a.competency_schemes as any)?.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600 whitespace-nowrap">
                    {format(new Date(a.created_at), "dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </TableCell>
                  <TableCell>
                    {a.status === "in_progress" ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1.5">
                        <Clock className="w-3 h-3" /> Dalam Proses
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1.5 text-slate-600"
                      >
                        <Clock className="w-3 h-3" /> Menunggu
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                      onClick={() => router.push(`/assessor/evaluate/${a.id}`)}
                    >
                      Evaluasi <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
