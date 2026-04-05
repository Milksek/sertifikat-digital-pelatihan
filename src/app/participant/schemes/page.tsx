"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  GraduationCap,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
const globalSchemesCache: Record<string, any[]> = {};
const globalMyAssessmentsCache: Record<string, Record<string, any>> = {};
export default function ParticipantSchemes() {
  const { user } = useAuth();
  const router = useRouter();
  const cacheKey = user?.id || "guest";
  const [schemes, setSchemes] = useState<any[]>(
    globalSchemesCache[cacheKey] || [],
  );
  const [myAssessments, setMyAssessments] = useState<Record<string, any>>(
    globalMyAssessmentsCache[cacheKey] || {},
  );
  const [loading, setLoading] = useState(!globalSchemesCache[cacheKey]);
  const [registering, setRegistering] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }
      const key = user.id;
      if (!globalSchemesCache[key]) setLoading(true);
      try {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(() => resolve({ isTimeout: true }), 5000);
        });
        const fetchAllData = async () => {
          try {
            const schemesRes = await supabase
              .from("competency_schemes")
              .select("*")
              .eq("status", "active")
              .order("created_at", { ascending: false });
            const assessmentsRes = await supabase
              .from("assessments")
              .select("id, scheme_id, status")
              .eq("participant_id", user.id);
            return { schemesRes, assessmentsRes };
          } catch (e) {
            throw e;
          }
        };
        const result = (await Promise.race([
          fetchAllData(),
          timeoutPromise,
        ])) as any;
        clearTimeout(timeoutId!);
        if (result?.isTimeout) {
          console.warn("Supabase fetch reached 5s timeout limit.");
          throw new Error("Schemes fetch timeout");
        }
        const { schemesRes, assessmentsRes } = result;
        const schemesData = schemesRes?.data;
        const assessmentsData = assessmentsRes?.data;
        const assessmentsMap: Record<string, any> = {};
        if (assessmentsData) {
          (assessmentsData as any[]).forEach((a: any) => {
            assessmentsMap[a.scheme_id] = a;
          });
        }
        if (schemesData) {
          setSchemes(schemesData);
          globalSchemesCache[key] = schemesData;
        }
        setMyAssessments(assessmentsMap);
        globalMyAssessmentsCache[key] = assessmentsMap;
      } catch (e) {
        console.error("Fetch Exception participant/schemes:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);
  const filteredSchemes = useMemo(() => {
    if (!search.trim()) return schemes;
    return schemes.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [schemes, search]);
  const handleRegister = async (scheme: any) => {
    if (!user) return;
    try {
      setRegistering(scheme.id);
      const criteriaObj =
        typeof scheme.criteria === "object" && !Array.isArray(scheme.criteria)
          ? (scheme.criteria as Record<string, any>)
          : null;
      const assessorIdToAssign = criteriaObj?.assessor_id || null;
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          participant_id: user.id,
          scheme_id: scheme.id,
          assessor_id: assessorIdToAssign,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Berhasil mendaftar uji kompetensi!");
      setMyAssessments((prev) => ({ ...prev, [scheme.id]: data }));
    } catch (e: any) {
      toast.error(e.message || "Gagal mendaftar uji kompetensi.");
    } finally {
      setRegistering(null);
    }
  };
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
          <Badge variant="outline" className="gap-1 text-slate-600">
            <Clock className="w-3 h-3" /> Menunggu Penilaian
          </Badge>
        );
    }
  };
  const getLevelFromCriteria = (criteria: unknown[]) => {
    if (!criteria || criteria.length === 0) return 3;
    return Math.min(9, Math.max(1, criteria.length + 2));
  };
  const getLevelColor = (level: number) => {
    if (level >= 7) return "bg-purple-100 text-purple-700 border-purple-200";
    if (level >= 5) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Skema Sertifikasi
          </h1>
          <p className="text-slate-500 mt-1">
            Jelajahi dan daftar uji kompetensi sesuai bidang keahlian Anda.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-slate-600 font-medium self-start sm:self-auto"
        >
          {schemes.length} skema tersedia
        </Badge>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Cari nama atau deskripsi skema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200 focus:border-blue-400"
          disabled={loading || schemes.length === 0}
        />
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <div className="p-6 pt-0">
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200 border-dashed text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Belum ada skema tersedia
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Saat ini belum ada skema sertifikasi yang diterbitkan. Silakan
            periksa kembali nanti.
          </p>
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200 text-center">
          <Search className="h-10 w-10 text-slate-200 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">
            Skema tidak ditemukan
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Coba kata kunci yang berbeda.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setSearch("")}
          >
            Hapus pencarian
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {filteredSchemes.map((scheme) => {
            const registeredAssessment = myAssessments[scheme.id];
            const criteriaList: unknown[] = Array.isArray(scheme.criteria)
              ? scheme.criteria
              : [];
            const isRegistered = !!registeredAssessment;
            const level = getLevelFromCriteria(criteriaList);
            const levelColor = getLevelColor(level);
            const criteriaObj =
              typeof scheme.criteria === "object" &&
              !Array.isArray(scheme.criteria)
                ? (scheme.criteria as Record<string, any>)
                : null;
            const kodeSkkni = criteriaObj?.kode
              ? String(criteriaObj.kode)
              : "SKKNI-" +
                String(scheme.id).split("-")[0].toUpperCase().slice(0, 8);
            return (
              <Card
                key={scheme.id}
                className="flex flex-col h-full hover:shadow-md transition-all duration-200 border-slate-200 bg-white"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs text-slate-500 bg-slate-100 border-0"
                    >
                      {kodeSkkni}
                    </Badge>
                    <Badge
                      className={`text-xs font-semibold border ${levelColor}`}
                    >
                      <GraduationCap className="w-3 h-3 mr-1" />
                      Level {level}
                    </Badge>
                    {isRegistered &&
                      getStatusBadge(registeredAssessment.status)}
                  </div>
                  <CardTitle className="text-lg leading-snug text-slate-900">
                    {scheme.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1 text-slate-500">
                    {scheme.description || "Tidak ada deskripsi."}
                  </CardDescription>
                  {criteriaObj?.assessor_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Asesor Penguji:{" "}
                      <span className="font-semibold text-slate-700">
                        {criteriaObj.assessor_name}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                  {criteriaList.length > 0 ? (
                    <div className="border border-slate-100 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {criteriaList.length} Unit Kompetensi
                        </span>
                      </div>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="units" className="border-0">
                          <AccordionTrigger className="px-3 py-2 text-sm font-medium hover:no-underline hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
                            Lihat Unit Kompetensi
                          </AccordionTrigger>
                          <AccordionContent className="px-0 pb-0">
                            <div className="divide-y divide-slate-100">
                              {criteriaList.map((c: any, idx: number) => (
                                <div
                                  key={c.id || idx}
                                  className="flex items-start gap-2.5 px-3 py-2.5 text-sm"
                                >
                                  <span className="font-mono text-xs text-slate-400 mt-0.5 flex-shrink-0">
                                    {(idx + 1).toString().padStart(2, "0")}.
                                  </span>
                                  <div>
                                    <p className="font-medium text-slate-700 leading-snug">
                                      {c.name}
                                    </p>
                                    {c.maxScore && (
                                      <p className="text-xs text-slate-400 mt-0.5">
                                        Skor Maks: {c.maxScore}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Tidak ada rincian unit kompetensi.
                    </p>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-100 mt-auto">
                  {isRegistered ? (
                    <Button
                      variant="outline"
                      className="w-full text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
                      onClick={() => router.push("/participant/assessments")}
                    >
                      Lihat Status Assessment
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleRegister(scheme)}
                      disabled={registering === scheme.id}
                    >
                      {registering === scheme.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Mendaftar...
                        </>
                      ) : (
                        "Daftar Assessment"
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
