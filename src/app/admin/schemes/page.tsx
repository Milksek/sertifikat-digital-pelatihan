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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Archive, BookOpen, Layers, X, User } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
interface CriteriaUnit {
  id: string;
  name: string;
  maxScore: number;
}
const EMPTY_FORM = {
  name: "",
  description: "",
  kode: "",
  level: "Level I - III (Operator)",
  masaBerlaku: 3,
  assessor_id: "none",
  assessor_name: "",
};
let globalCachedSchemes: any[] | null = null;
export default function AdminSchemes() {
  const { user } = useAuth();
  const [schemes, setSchemes] = useState<any[]>(globalCachedSchemes || []);
  const [loading, setLoading] = useState(globalCachedSchemes === null);
  const [open, setOpen] = useState(false);
  const [editScheme, setEditScheme] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [units, setUnits] = useState<CriteriaUnit[]>([
    { id: "u1", name: "", maxScore: 100 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [assessors, setAssessors] = useState<any[]>([]);
  const fetchAssessors = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "assessor");
    if (data) setAssessors(data);
  };
  useEffect(() => {
    fetchAssessors();
  }, []);
  const fetchSchemes = async () => {
    if (!globalCachedSchemes) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("competency_schemes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase Error fetching schemes:", error);
      }
      if (data) {
        setSchemes(data);
        globalCachedSchemes = data;
      }
    } catch (e) {
      console.error("Fetch Exception:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSchemes();
  }, []);
  const openCreate = () => {
    setEditScheme(null);
    setForm(EMPTY_FORM);
    setUnits([{ id: "u1", name: "", maxScore: 100 }]);
    setOpen(true);
  };
  const openEdit = (s: any) => {
    setEditScheme(s);
    setForm({
      name: s.name || "",
      description: s.description || "",
      kode: s.criteria?.kode || "",
      level: s.criteria?.level || "Level I - III (Operator)",
      masaBerlaku: 3,
      assessor_id: s.criteria?.assessor_id || "none",
      assessor_name: s.criteria?.assessor_name || "",
    });
    const u: CriteriaUnit[] = Array.isArray(s.criteria)
      ? s.criteria.map((c: any, i: number) => ({
          id: c.id || `u${i}`,
          name: c.name || "",
          maxScore: c.maxScore || 100,
        }))
      : Array.isArray(s.criteria?.units)
        ? s.criteria.units
        : [{ id: "u1", name: "", maxScore: 100 }];
    setUnits(u);
    setOpen(true);
  };
  const addUnit = () =>
    setUnits((prev) => [
      ...prev,
      { id: `u${Date.now()}`, name: "", maxScore: 100 },
    ]);
  const removeUnit = (id: string) =>
    setUnits((prev) => prev.filter((u) => u.id !== id));
  const updateUnit = (
    id: string,
    field: keyof CriteriaUnit,
    value: string | number,
  ) =>
    setUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nama skema wajib diisi");
      return;
    }
    if (!form.kode.trim()) {
      toast.error("Kode SKKNI wajib diisi");
      return;
    }
    const filledUnits = units.filter((u) => u.name.trim());
    if (filledUnits.length === 0) {
      toast.error("Minimal 1 unit kompetensi harus diisi");
      return;
    }
    try {
      setSubmitting(true);
      const criteriaPayload = {
        kode: form.kode,
        level: form.level,
        masaBerlaku: form.masaBerlaku,
        assessor_id: form.assessor_id === "none" ? null : form.assessor_id,
        assessor_name: form.assessor_id === "none" ? null : form.assessor_name,
        units: filledUnits.map((u) => ({
          id: u.id,
          name: u.name,
          maxScore: u.maxScore,
        })),
      };
      const payload = {
        name: form.name,
        description: form.description,
        criteria: criteriaPayload,
        ...(editScheme ? {} : { created_by: user?.id, status: "active" }),
      };
      let error;
      if (editScheme) {
        ({ error } = await supabase
          .from("competency_schemes")
          .update(payload)
          .eq("id", editScheme.id));
      } else {
        ({ error } = await supabase.from("competency_schemes").insert(payload));
      }
      if (error) throw error;
      toast.success(
        editScheme ? "Skema berhasil diperbarui" : "Skema berhasil dibuat",
      );
      setOpen(false);
      fetchSchemes();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan skema");
    } finally {
      setSubmitting(false);
    }
  };
  const handleArchive = async (s: any) => {
    const newStatus = s.status === "active" ? "archived" : "active";
    const { error } = await supabase
      .from("competency_schemes")
      .update({ status: newStatus })
      .eq("id", s.id);
    if (error) {
      toast.error("Gagal mengubah status");
      return;
    }
    toast.success(
      `Skema ${newStatus === "archived" ? "diarsipkan" : "diaktifkan"}`,
    );
    fetchSchemes();
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Skema Sertifikasi
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola standar kompetensi dan unit uji kompetensi.
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4" /> Tambah Skema
        </Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">
                Nama Skema
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Kode SKKNI
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Level
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Unit
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Status
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Dibuat
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
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : schemes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <BookOpen className="w-10 h-10 text-slate-200" />
                    <p className="text-slate-500 text-sm">
                      Belum ada skema. Buat skema pertama.
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={openCreate}
                    >
                      Tambah Skema
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              schemes.map((s) => {
                const criteriaList = Array.isArray(s.criteria)
                  ? s.criteria
                  : s.criteria?.units || [];
                const kode =
                  s.criteria?.kode ||
                  s.kode ||
                  "SKKNI-" + s.id.slice(0, 8).toUpperCase();
                let levelText = s.criteria?.level;
                if (!levelText) {
                  if (s.level) {
                    levelText =
                      typeof s.level === "number" ? `Lv. ${s.level}` : s.level;
                  } else if (criteriaList.length) {
                    levelText = `Lv. ${Math.min(9, criteriaList.length + 2)}`;
                  } else {
                    levelText = "Lv. 3";
                  }
                } else if (typeof levelText === "number") {
                  levelText = `Lv. ${levelText}`;
                }
                const criteriaObj =
                  typeof s.criteria === "object" && !Array.isArray(s.criteria)
                    ? s.criteria
                    : null;
                return (
                  <TableRow key={s.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-semibold text-slate-800 max-w-[200px]">
                      <p className="line-clamp-1">{s.name}</p>
                      <p className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5">
                        {s.description}
                      </p>
                      {criteriaObj?.assessor_name && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 w-fit px-1.5 py-0.5 rounded shadow-sm">
                          <User className="w-3 h-3" />{" "}
                          {criteriaObj.assessor_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {kode}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {levelText}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />{" "}
                        {criteriaList.length} unit
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.status === "active" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-slate-500">
                          Diarsipkan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(new Date(s.created_at), "dd MMM yyyy", {
                        locale: idLocale,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-200 h-7 text-xs gap-1"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 text-xs gap-1 ${s.status === "active" ? "border-orange-200 text-orange-600 hover:bg-orange-50" : "border-slate-200"}`}
                          onClick={() => handleArchive(s)}
                        >
                          <Archive className="w-3 h-3" />{" "}
                          {s.status === "active" ? "Arsipkan" : "Aktifkan"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editScheme
                ? "Edit Skema Sertifikasi"
                : "Buat Skema Sertifikasi Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Nama Skema <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="cth: Pengembang Web Frontend"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Kode SKKNI <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.kode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kode: e.target.value }))
                  }
                  placeholder="cth: SKKNI-J.620100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level Kompetensi</Label>
                <Select
                  value={String(form.level)}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, level: val }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Level I - III (Operator)">
                      Level I - III (Operator)
                    </SelectItem>
                    <SelectItem value="Level IV - VI (Teknisi/Analis)">
                      Level IV - VI (Teknisi/Analis)
                    </SelectItem>
                    <SelectItem value="Level VII - IX (Ahli/Profesional)">
                      Level VII - IX (Ahli/Profesional)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Asesor Penguji (Opsional)</Label>
                <Select
                  value={form.assessor_id || "none"}
                  onValueChange={(val) => {
                    const selected = assessors.find((a) => a.id === val);
                    setForm((f) => ({
                      ...f,
                      assessor_id: val,
                      assessor_name: selected?.full_name || "",
                    }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Belum Ditugaskan / Bebas
                    </SelectItem>
                    {assessors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Gambaran umum persyaratan skema kompetensi"
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Unit Kompetensi
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addUnit}
                >
                  <Plus className="w-3 h-3" /> Tambah Unit
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {units.map((unit, idx) => (
                  <div
                    key={unit.id}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <span className="text-xs font-mono text-slate-400 w-5 flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <Input
                      value={unit.name}
                      onChange={(e) =>
                        updateUnit(unit.id, "name", e.target.value)
                      }
                      placeholder="Nama unit kompetensi"
                      className="h-8 text-sm flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={unit.maxScore}
                      onChange={(e) =>
                        updateUnit(
                          unit.id,
                          "maxScore",
                          parseInt(e.target.value) || 100,
                        )
                      }
                      className="h-8 text-sm w-20"
                      placeholder="Max"
                    />
                    <span className="text-xs text-slate-400">pts</span>
                    {units.length > 1 && (
                      <button
                        onClick={() => removeUnit(unit.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting
                ? "Menyimpan..."
                : editScheme
                  ? "Perbarui Skema"
                  : "Simpan Skema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
