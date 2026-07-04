"use client";
import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Search,
  UserX,
  Shield,
  UserPlus,
  Wallet,
  Loader2,
} from "lucide-react";

let globalAssessorsCache: any[] | null = null;

export default function AdminAssessors() {
  const [users, setUsers] = useState<any[]>(globalAssessorsCache || []);
  const [loading, setLoading] = useState(!globalAssessorsCache);
  const [search, setSearch] = useState("");

  
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    walletAddress: "",
    fullName: "",
    email: "",
    phone: "",
  });

  const fetchUsers = async () => {
    if (!globalAssessorsCache) setLoading(true);

    try {
      const res = await fetch("/api/admin/assessors", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || `Gagal memuat asesor (HTTP ${res.status})`);
      }

      const assessors = payload.assessors || [];
      setUsers(assessors);
      globalAssessorsCache = assessors;
    } catch (error: any) {
      console.error("Failed to fetch assessors:", error);
      setUsers([]);
      globalAssessorsCache = [];
      toast.error(error?.message || "Gagal memuat daftar asesor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAssessorRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "assessor" ? "participant" : "assessor";
    try {
      const { error } = await supabase
        .from("profil")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
      toast.success(
        `Role berhasil diubah menjadi ${newRole === "assessor" ? "Asesor" : "Peserta"}`,
      );
      globalAssessorsCache = null;
      fetchUsers();
    } catch (e: unknown) {
      toast.error((e as any).message || "Gagal mengubah role");
    }
  };

  const handleCreateAssessor = async () => {
    const wallet = form.walletAddress.trim().toLowerCase();
    if (!wallet.startsWith("0x") || wallet.length !== 42) {
      toast.error("Wallet address tidak valid. Harus 42 karakter diawali 0x.");
      return;
    }
    if (!form.fullName.trim()) {
      toast.error("Nama asesor wajib diisi.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email asesor wajib diisi.");
      return;
    }

    try {
      setCreating(true);

      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone ? `+62${form.phone}` : undefined,
          role: "assessor",
        }),
      });
      const syncData = await res.json();
      if (!res.ok || !syncData.success) {
        throw new Error(syncData.error || `Gagal membuat akun (HTTP ${res.status})`);
      }

      toast.success(`Akun asesor untuk ${form.fullName} berhasil dibuat!`);
      setForm({ walletAddress: "", fullName: "", email: "", phone: "" });
      setCreateOpen(false);
      globalAssessorsCache = null;
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat akun asesor");
    } finally {
      setCreating(false);
    }
  };

  const assessorCount = users.length;
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
            Buat akun asesor baru atau ubah peran pengguna yang sudah terdaftar.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">
              {assessorCount} Asesor Terdaftar
            </span>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="w-4 h-4" /> Buat Akun Asesor
          </Button>
        </div>
      </div>

      {}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-semibold">Manajemen Asesor oleh Admin</p>
          <p className="text-blue-600 mt-0.5">
            Akun asesor hanya dapat dibuat oleh admin menggunakan wallet address asesor.
            Pengguna baru yang login sendiri akan otomatis terdaftar sebagai <strong>peserta</strong>.
          </p>
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
                    <Shield className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-slate-500">
                      {search
                        ? "Tidak ada asesor yang cocok."
                        : "Belum ada asesor."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50/60">
                  <TableCell>
                    <p className="font-semibold text-slate-800">
                      {u.full_name || <span className="text-slate-400 italic">Belum lengkap</span>}
                    </p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {u.nik || ","}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {u.wallet_address
                      ? `${u.wallet_address.slice(0, 6)}...${u.wallet_address.slice(-4)}`
                      : ","}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 gap-1">
                      <Shield className="w-3 h-3" /> Asesor
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {format(new Date(u.created_at), "dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                      variant="outline"
                      onClick={() => toggleAssessorRole(u.id, u.role)}
                    >
                      <UserX className="w-3 h-3" /> Cabut Asesor
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <UserPlus className="w-5 h-5" /> Buat Akun Asesor Baru
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700">
              <p>
                Masukkan wallet address asesor. Jika wallet belum pernah login,
                akun akan dibuat otomatis. Asesor cukup login dengan wallet tersebut.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletAddress">
                Wallet Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="walletAddress"
                  placeholder="0x1234...abcd (42 karakter)"
                  value={form.walletAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, walletAddress: e.target.value }))
                  }
                  className="pl-9 font-mono text-sm"
                />
              </div>
              {form.walletAddress && !form.walletAddress.startsWith("0x") && (
                <p className="text-xs text-red-500">Wallet harus diawali dengan 0x</p>
              )}
              {form.walletAddress.startsWith("0x") && form.walletAddress.length !== 42 && (
                <p className="text-xs text-amber-600">
                  {42 - form.walletAddress.length} karakter lagi...
                </p>
              )}
              {form.walletAddress.startsWith("0x") && form.walletAddress.length === 42 && (
                <p className="text-xs text-emerald-600">✓ Format wallet valid</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Nama Lengkap Asesor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Nama sesuai identitas resmi"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@domain.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">No. HP (Opsional)</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">
                    +62
                  </span>
                  <Input
                    id="phone"
                    placeholder="8xxxxxxxxxx"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value.replace(/^0/, "") }))
                    }
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Batal
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              onClick={handleCreateAssessor}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Membuat...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Buat Akun Asesor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


