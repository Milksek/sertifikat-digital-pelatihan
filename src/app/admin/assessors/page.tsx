"use client";
import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Search, UserCheck, UserX, Users, Shield } from "lucide-react";
let globalAssessorsCache: any[] | null = null;
export default function AdminAssessors() {
  const [users, setUsers] = useState<any[]>(globalAssessorsCache || []);
  const [loading, setLoading] = useState(!globalAssessorsCache);
  const [search, setSearch] = useState("");
  const fetchUsers = async () => {
    if (!globalAssessorsCache) setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .order("created_at", { ascending: false });
    if (data) {
      setUsers(data);
      globalAssessorsCache = data;
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchUsers();
  }, []);
  const toggleAssessorRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "assessor" ? "participant" : "assessor";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
      toast.success(
        `Role berhasil diubah menjadi ${newRole === "assessor" ? "Asesor" : "Peserta"}`,
      );
      fetchUsers();
    } catch (e: unknown) {
      toast.error((e as any).message || "Gagal mengubah role");
    }
  };
  const assessorCount = users.filter((u) => u.role === "assessor").length;
  const participantCount = users.filter((u) => u.role === "participant").length;
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.wallet_address?.toLowerCase().includes(q) ||
      u.nik?.toLowerCase().includes(q)
    );
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Kelola Asesor
          </h1>
          <p className="text-slate-500 mt-1">
            Promosikan peserta menjadi asesor, atau cabut hak akses.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">
              {assessorCount} Asesor
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">
              {participantCount} Peserta
            </span>
          </div>
        </div>
      </div>
      {users.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama, email, wallet, atau NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                Pengguna
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                NIK
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Wallet
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Peran
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Mendaftar
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
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-500">
                      {search
                        ? "Tidak ada user yang cocok."
                        : "Belum ada pengguna."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50/60">
                  <TableCell>
                    <p className="font-semibold text-slate-800">
                      {u.full_name || "Anonim"}
                    </p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {u.nik || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {u.wallet_address
                      ? `${u.wallet_address.slice(0, 6)}...${u.wallet_address.slice(-4)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {u.role === "assessor" ? (
                      <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 gap-1">
                        <Shield className="w-3 h-3" /> Asesor
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 gap-1">
                        <Users className="w-3 h-3" /> Peserta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {format(new Date(u.created_at), "dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className={`h-7 text-xs gap-1.5 ${u.role === "assessor" ? "border-red-200 text-red-600 hover:bg-red-50" : "bg-indigo-600 hover:bg-indigo-700"}`}
                      variant={u.role === "assessor" ? "outline" : "default"}
                      onClick={() => toggleAssessorRole(u.id, u.role)}
                    >
                      {u.role === "assessor" ? (
                        <>
                          <UserX className="w-3 h-3" /> Cabut Asesor
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3" /> Jadikan Asesor
                        </>
                      )}
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
