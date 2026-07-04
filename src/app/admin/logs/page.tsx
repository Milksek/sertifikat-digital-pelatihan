"use client";
import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/supabase";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Search,
  Award,
  ShieldBan,
  FileCheck,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
const ACTION_LABELS: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  mint_certificate: {
    label: "Mint Sertifikat",
    icon: Award,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  pencabutan_sertifikat: {
    label: "Pencabutan Sertifikat",
    icon: ShieldBan,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  assign_assessor: {
    label: "Penugasan Asesor",
    icon: ClipboardList,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
};
const globalLogsCache: Record<string, any[]> = {};

function formatLogDetails(log: any) {
  if (!log.details) return "-";
  if (log.action === "mint_certificate") {
    try {
      const parsed = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
      return `Mint sertifikat ${parsed.certificate_number} untuk wallet ${parsed.participant_wallet.slice(0, 8)}... (Token ID: ${parsed.token_id})`;
    } catch {
      return log.details;
    }
  }
  return log.details;
}

export default function AdminLogs() {
  const [actionFilter, setActionFilter] = useState("all");
  const [logs, setLogs] = useState<any[]>(globalLogsCache[actionFilter] || []);
  const [loading, setLoading] = useState(!globalLogsCache[actionFilter]);
  const [search, setSearch] = useState("");
  const fetchLogs = useCallback(async () => {
    if (!globalLogsCache[actionFilter]) setLoading(true);
    let query = supabase
      .from("log_aktivitas")
      .select(`*, profil(full_name, email)`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (actionFilter !== "all") {
      query = query.eq("activity_type", actionFilter);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching logs:", error);
    }
    if (data) {
      const mapped = data.map((x: any) => ({
        ...x,
        action: x.activity_type,
        details: x.activity_detail,
      }));
      setLogs(mapped);
      globalLogsCache[actionFilter] = mapped;
    }
    setLoading(false);
  }, [actionFilter]);
  useEffect(() => {
    startTransition(() => { fetchLogs(); });
  }, [actionFilter, fetchLogs]);
  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.details && l.details.toLowerCase().includes(q)) ||
      ((l.profil as any)?.full_name && (l.profil as any).full_name.toLowerCase().includes(q)) ||
      ((l.profil as any)?.email && (l.profil as any).email.toLowerCase().includes(q))
    );
  });
  const getActionBadge = (action: string) => {
    const cfg = ACTION_LABELS[action];
    if (!cfg) {
      return (
        <Badge variant="outline" className="text-slate-500 text-xs">
          {action}
        </Badge>
      );
    }
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} gap-1 text-xs hover:${cfg.color}`}>
        <Icon className="w-3 h-3" /> {cfg.label}
      </Badge>
    );
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Log Aktivitas
          </h1>
          <p className="text-slate-500 mt-1">
            Rekam jejak seluruh aksi penting di platform.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          onClick={fetchLogs}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari aksi, detail, atau nama pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-52 bg-white border-slate-200">
            <SelectValue placeholder="Filter Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            <SelectItem value="mint_certificate">Mint Sertifikat</SelectItem>
            <SelectItem value="pencabutan_sertifikat">Pencabutan</SelectItem>
            <SelectItem value="assign_assessor">Penugasan Asesor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                Waktu
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Pengguna
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Aksi
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Detail
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-500">
                      Tidak ada log yang ditemukan.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/60">
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    <div>
                      {format(new Date(log.created_at), "dd MMM yyyy", {
                        locale: idLocale,
                      })}
                    </div>
                    <div className="text-slate-400">
                      {format(new Date(log.created_at), "HH:mm:ss")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800 text-sm">
                      {(log.profil as any)?.full_name || ","}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(log.profil as any)?.email || log.actor_id?.slice(0, 8)}
                    </p>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs">
                    <span className="line-clamp-2">{formatLogDetails(log)}</span>
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


