"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  User,
  Hash,
  Phone,
  Wallet,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
export default function AdminParticipants() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  useEffect(() => {
    async function fetchParticipants() {
      try {
        const { data: rawProfiles, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, nik, phone, email, wallet_address, created_at",
          )
          .eq("role", "participant")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const baseProfiles = rawProfiles || [];
        const { data: assessData } = await supabase
          .from("assessments")
          .select("participant_id");
        const { data: certData } = await supabase
          .from("certificates")
          .select("participant_wallet");
        const assessCounts = (assessData || []).reduce((acc: any, curr) => {
          acc[curr.participant_id] = (acc[curr.participant_id] || 0) + 1;
          return acc;
        }, {});
        const certCounts = (certData || []).reduce((acc: any, curr) => {
          if (curr.participant_wallet) {
            const w = curr.participant_wallet.toLowerCase();
            acc[w] = (acc[w] || 0) + 1;
          }
          return acc;
        }, {});
        const merged = baseProfiles.map((p) => ({
          ...p,
          assessmentsCount: assessCounts[p.id] || 0,
          certificatesCount: p.wallet_address
            ? certCounts[p.wallet_address.toLowerCase()] || 0
            : 0,
        }));
        setParticipants(merged);
      } catch (e: any) {
        console.error("Failed to map participants:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchParticipants();
  }, []);
  const filteredParticipants = useMemo(() => {
    if (!search.trim()) return participants;
    const lower = search.toLowerCase();
    return participants.filter(
      (p) =>
        (p.full_name || "").toLowerCase().includes(lower) ||
        (p.nik || "").toLowerCase().includes(lower) ||
        (p.wallet_address || "").toLowerCase().includes(lower) ||
        (p.email || "").toLowerCase().includes(lower),
    );
  }, [search, participants]);
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Kelola Peserta
          </h1>
          <p className="text-slate-500 mt-2">
            Lihat daftar seluruh kandidat/peserta yang terdaftar di platform.
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama, NIK, email, atau wallet..."
              className="pl-9 border-slate-200 focus-visible:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total: {filteredParticipants.length} Peserta
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700 w-[250px]">
                  Informasi Peserta
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Kontak
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Kredensial
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Aktivitas
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-slate-500"
                  >
                    Tidak ada data peserta ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParticipants.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900">
                          {p.full_name || "Belum diatur"}
                        </span>
                        <div className="flex items-center text-xs text-slate-500 mt-0.5">
                          <Hash className="w-3 h-3 mr-1" />
                          NIK: {p.nik || "Belum diatur"}
                        </div>
                        <div
                          className="flex items-center text-[10px] text-slate-400 font-mono mt-1 w-48 truncate"
                          title={p.wallet_address}
                        >
                          <Wallet className="w-3 h-3 mr-1 shrink-0" />
                          {p.wallet_address?.slice(0, 10)}...
                          {p.wallet_address?.slice(-6)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 text-sm">
                        <span className="text-slate-600">{p.email || "-"}</span>
                        <div className="flex items-center text-slate-500 text-xs">
                          <Phone className="w-3 h-3 mr-1" />
                          {p.phone || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant="outline"
                          className="w-fit border-blue-200 bg-blue-50 text-blue-700 font-normal"
                        >
                          <Layers className="w-3 h-3 mr-1" />
                          {p.assessmentsCount || 0} Uji Kompetensi
                        </Badge>
                        <Badge
                          variant="outline"
                          className="w-fit border-purple-200 bg-purple-50 text-purple-700 font-normal"
                        >
                          <Award className="w-3 h-3 mr-1" />
                          {p.certificatesCount || 0} Sertifikat
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Bergabung sejak:
                        <br />
                        {format(new Date(p.created_at), "dd MMM yyyy", {
                          locale: idLocale,
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
