"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  FileCheck,
  BookOpen,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
const globalStatsCache: Record<string, any> = {};
const globalRecentCache: Record<string, any[]> = {};
export default function ParticipantDashboard() {
  const { user } = useAuth();
  const cacheKey = user?.id || "guest";
  const [stats, setStats] = useState(
    globalStatsCache[cacheKey] || {
      assessments: 0,
      certificates: 0,
      schemes: 0,
    },
  );
  const [recentAssessments, setRecentAssessments] = useState<any[]>(
    globalRecentCache[cacheKey] || [],
  );
  const [loading, setLoading] = useState(!globalStatsCache[cacheKey]);
  useEffect(() => {
    async function fetchStats() {
      if (!user) {
        setLoading(false);
        return;
      }
      const key = user.id;
      if (!globalStatsCache[key]) setLoading(true);
      try {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(() => resolve({ isTimeout: true }), 5000);
        });
        const fetchAllData = async () => {
          try {
            const assessmentCountRes = await supabase
              .from("assessments")
              .select("*", { count: "exact", head: true })
              .eq("participant_id", user.id)
              .in("status", ["pending", "in_progress", "evaluated"]);
            const certCountRes = await supabase
              .from("certificates")
              .select("*", { count: "exact", head: true })
              .eq(
                "participant_wallet",
                (user.wallet_address || "").toLowerCase(),
              )
              .eq("status", "active");
            const schemeCountRes = await supabase
              .from("competency_schemes")
              .select("*", { count: "exact", head: true })
              .eq("status", "active");
            const recentRes = await supabase
              .from("assessments")
              .select("id, status, created_at, competency_schemes(name)")
              .eq("participant_id", user.id)
              .order("created_at", { ascending: false })
              .limit(5);
            return {
              assessmentCountRes,
              certCountRes,
              schemeCountRes,
              recentRes,
            };
          } catch (fetchErr) {
            console.error("[Dashboard] Fetch all data threw error:", fetchErr);
            throw fetchErr;
          }
        };
        const result = (await Promise.race([
          fetchAllData(),
          timeoutPromise,
        ])) as any;
        clearTimeout(timeoutId!);
        if (result?.isTimeout) {
          console.warn("Supabase fetch reached 5s timeout limit.");
          throw new Error("Dashboard fetch timeout");
        }
        const { assessmentCountRes, certCountRes, schemeCountRes, recentRes } =
          result;
        const newStats = {
          assessments: assessmentCountRes?.count || 0,
          certificates: certCountRes?.count || 0,
          schemes: schemeCountRes?.count || 0,
        };
        setStats(newStats);
        globalStatsCache[key] = newStats;
        if (recentRes?.data) {
          setRecentAssessments(recentRes.data);
          globalRecentCache[key] = recentRes.data;
        }
      } catch (e) {
        console.error("Dashboard MAIN catch block fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Lulus
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1">
            <XCircle className="w-3 h-3" /> Tidak Lulus
          </Badge>
        );
      case "evaluated":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 gap-1">
            <Clock className="w-3 h-3" /> Menunggu Persetujuan
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1">
            <Clock className="w-3 h-3" /> Sedang Dinilai
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" /> Terdaftar
          </Badge>
        );
    }
  };
  const statCards = [
    {
      label: "Sertifikat Aktif",
      value: stats.certificates,
      icon: Award,
      gradient: "from-amber-400 to-orange-500",
      bg: "bg-amber-50",
      textColor: "text-amber-700",
      link: "/participant/certificates",
    },
    {
      label: "Assessment Berjalan",
      value: stats.assessments,
      icon: FileCheck,
      gradient: "from-blue-400 to-indigo-500",
      bg: "bg-blue-50",
      textColor: "text-blue-700",
      link: "/participant/assessments",
    },
    {
      label: "Skema Tersedia",
      value: stats.schemes,
      icon: BookOpen,
      gradient: "from-purple-400 to-violet-500",
      bg: "bg-purple-50",
      textColor: "text-purple-700",
      link: "/participant/schemes",
    },
  ];
  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  const firstName = user?.full_name?.split(" ")[0] || "Peserta";
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-indigo-400 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-blue-300 font-medium">
                Portal Peserta
              </span>
            </div>
            <h1 className="text-3xl font-bold">
              Selamat Datang, {firstName} 👋
            </h1>
            <p className="text-blue-300 mt-2 text-sm">
              Kelola perjalanan kompetensi Anda dari satu tempat.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl font-bold">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.link}>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-slate-200 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </CardTitle>
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-extrabold text-slate-800 mb-1">
                    {stat.value}
                  </div>
                  <div
                    className={`text-xs font-medium flex items-center gap-1 ${stat.textColor}`}
                  >
                    Lihat semua{" "}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/participant/schemes">
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-3 px-4 border-slate-200 hover:border-blue-300 hover:bg-blue-50 group"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
              <span className="text-sm">Jelajahi Skema</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <Link href="/participant/assessments">
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-3 px-4 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 group"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
              <span className="text-sm">Assessment Saya</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <Link href="/participant/certificates">
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-3 px-4 border-slate-200 hover:border-amber-300 hover:bg-amber-50 group"
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-slate-500 group-hover:text-amber-600" />
              <span className="text-sm">Sertifikat NFT</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">
            Aktivitas Assessment Terkini
          </CardTitle>
          <Link href="/participant/assessments">
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
          {recentAssessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                <FileCheck className="w-8 h-8 text-blue-300" />
              </div>
              <p className="text-slate-600 font-medium">Belum ada aktivitas</p>
              <p className="text-slate-400 text-sm mt-1 max-w-[200px]">
                Assessment yang Anda ikuti akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssessments.map((assessment: any) => (
                <div
                  key={assessment.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200 gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-white p-2 rounded-lg shadow-sm group-hover:shadow group-hover:text-blue-600 transition-all">
                      <BookOpen className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                        {assessment.competency_schemes?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(
                            new Date(assessment.created_at),
                            "dd MMMM yyyy",
                            { locale: idLocale },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    {getStatusBadge(assessment.status)}
                    <Link href={`/participant/assessments`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-white hover:bg-blue-100 text-slate-400 hover:text-blue-600 shadow-sm sm:shadow-none"
                      >
                        <ChevronRight className="w-4 h-4" />
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
