"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileCheck,
  Activity,
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  Star,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
const globalAssessorStatsCache: Record<string, any> = {};
const globalAssessorRecentCache: Record<string, any[]> = {};
export default function AssessorDashboard() {
  const { user } = useAuth();
  const cacheKey = user?.id || "guest";
  const [stats, setStats] = useState(
    globalAssessorStatsCache[cacheKey] || {
      pending: 0,
      completed: 0,
      kompeten: 0,
    },
  );
  const [recentPending, setRecentPending] = useState<any[]>(
    globalAssessorRecentCache[cacheKey] || [],
  );
  const [loading, setLoading] = useState(!globalAssessorStatsCache[cacheKey]);
  useEffect(() => {
    async function fetchStats() {
      if (!user) {
        setLoading(false);
        return;
      }
      const key = user.id;
      if (!globalAssessorStatsCache[key]) setLoading(true);
      try {
        const pendingRes = await supabase
          .from("assessments")
          .select("*", { count: "exact", head: true })
          .eq("assessor_id", user.id)
          .in("status", ["pending", "in_progress"]);
        const completedRes = await supabase
          .from("assessments")
          .select("*", { count: "exact", head: true })
          .eq("assessor_id", user.id)
          .in("status", ["evaluated", "approved", "rejected"]);
        const kompetenRes = await supabase
          .from("assessments")
          .select("*", { count: "exact", head: true })
          .eq("assessor_id", user.id)
          .like("recommendation", "Kompeten%");
        const pendingDataRes = await supabase
          .from("assessments")
          .select(
            "id, status, created_at, competency_schemes(name), profiles!participant_id(full_name)",
          )
          .in("status", ["pending", "in_progress"])
          .eq("assessor_id", user.id)
          .order("created_at", { ascending: true })
          .limit(4);
        const newStats = {
          pending: pendingRes.count || 0,
          completed: completedRes.count || 0,
          kompeten: kompetenRes.count || 0,
        };
        setStats(newStats);
        globalAssessorStatsCache[key] = newStats;
        if (pendingDataRes.data) {
          setRecentPending(pendingDataRes.data);
          globalAssessorRecentCache[key] = pendingDataRes.data;
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);
  const firstName = user?.full_name?.split(" ")[0] || "Asesor";
  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-indigo-400 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-blue-400 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-blue-300 font-medium">
                Portal Asesor
              </span>
            </div>
            <h1 className="text-3xl font-bold">Halo, {firstName} 👋</h1>
            <p className="text-blue-300 mt-2 text-sm">
              {stats.pending > 0
                ? `Ada ${stats.pending} peserta menunggu penilaian Anda.`
                : "Semua evaluasi sudah selesai. Kerja bagus!"}
            </p>
          </div>
          <Link href="/assessor/evaluations">
            <Button className="bg-white text-indigo-900 hover:bg-blue-50 font-semibold gap-2 shrink-0">
              Mulai Evaluasi <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Link href="/assessor/evaluations">
          <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-slate-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">
                Menunggu Evaluasi
              </CardTitle>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800 mb-1">
                {stats.pending}
              </div>
              <div className="text-xs font-medium text-orange-600 flex items-center gap-1">
                Perlu ditindaklanjuti{" "}
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/assessor/completed">
          <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-slate-200 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">
                Evaluasi Selesai
              </CardTitle>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800 mb-1">
                {stats.completed}
              </div>
              <div className="text-xs font-medium text-blue-600 flex items-center gap-1">
                Lihat riwayat{" "}
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              Peserta Kompeten
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-800 mb-1">
              {stats.kompeten}
            </div>
            <div className="text-xs font-medium text-emerald-600">
              Total dinyatakan kompeten
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">
            Antrian Evaluasi
          </CardTitle>
          <Link href="/assessor/evaluations">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 gap-1 text-xs"
            >
              Lihat semua <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentPending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-500">
                Tidak ada peserta yang menunggu.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPending.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {(a.profiles as any)?.full_name || "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(a.competency_schemes as any)?.name} ·{" "}
                      {format(new Date(a.created_at), "dd MMM yyyy", {
                        locale: idLocale,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.status === "in_progress" ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-xs">
                        <Clock className="w-3 h-3" /> Dalam Proses
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Clock className="w-3 h-3" /> Menunggu
                      </Badge>
                    )}
                    <Link href={`/assessor/evaluate/${a.id}`}>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                      >
                        Evaluasi
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
