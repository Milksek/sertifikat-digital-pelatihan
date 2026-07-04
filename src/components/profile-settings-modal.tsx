"use client";
import { useState, useEffect } from "react";
import { User, Mail, Phone, Hash, X, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { useWallet } from "@/contexts/WalletContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export function ProfileSettingsModal({
  isOpen,
  onClose,
  isClosable = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  isClosable?: boolean;
}) {
  const { user } = useAuth();
  const { walletAddress } = useWallet();
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    nik: "",
  });
  useEffect(() => {
    let active = true;

    async function hydrateProfile() {
      if (!isOpen) return;

      const cachedRaw = typeof window !== "undefined"
        ? localStorage.getItem("ssdp_profile")
        : null;
      const cachedProfile = cachedRaw ? JSON.parse(cachedRaw) : null;
      const sourceProfile = user || cachedProfile;

      if (sourceProfile) {
        setForm({
          fullName: sourceProfile.full_name || "",
          email: sourceProfile.email || "",
          phone: sourceProfile.phone || "",
          nik: sourceProfile.nik || "",
        });
      }

      setLoadingProfile(true);
      const token = localStorage.getItem("ssdp_token");
      let data: any = null;

      if (token) {
        const response = await fetch("/api/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json().catch(() => null);
        data = result?.profile || null;
      }

      if (!data && walletAddress) {
        const walletResponse = await fetch(`/api/profile/by-wallet?wallet=${walletAddress}`);
        const walletResult = await walletResponse.json().catch(() => null);
        data = walletResult?.profile || null;
      }

      if (!active || !data) {
        setLoadingProfile(false);
        return;
      }

      setForm({
        fullName: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
        nik: data.nik || "",
      });

      localStorage.setItem(
        "ssdp_profile",
        JSON.stringify({
          ...cachedProfile,
          ...data,
        }),
      );

      setLoadingProfile(false);
    }

    hydrateProfile();
    return () => {
      active = false;
    };
  }, [user, isOpen, walletAddress]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cachedRaw = typeof window !== "undefined"
      ? localStorage.getItem("ssdp_profile")
      : null;
    const cachedProfile = cachedRaw ? JSON.parse(cachedRaw) : null;
    const sourceProfile = user || cachedProfile;

    if (!sourceProfile?.id) return;
    if (!form.fullName || !form.email || !form.phone) {
      toast.error("Lengkapi semua field wajib");
      return;
    }
    if (sourceProfile.role === "participant" && form.nik.length !== 16) {
      toast.error("NIK harus 16 digit");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from("profil")
        .update({
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          nik: form.nik,
        })
        .eq("id", sourceProfile.id);
      if (error) throw error;
      const newProfile = {
        ...cachedProfile,
        ...sourceProfile,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        nik: form.nik,
      };
      localStorage.setItem("ssdp_profile", JSON.stringify(newProfile));
      window.dispatchEvent(new Event("ssdp_auth_change"));
      toast.success(
        isClosable
          ? "Profil berhasil diperbarui!"
          : "Profil berhasil dilengkapi!",
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {" "}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
        {" "}
        {isClosable && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            {" "}
            <X className="w-5 h-5" />{" "}
          </button>
        )}{" "}
        <div className="p-8">
          {" "}
          <div className="flex items-center gap-3 mb-6">
            {" "}
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              {" "}
              <User className="w-5 h-5 text-blue-600" />{" "}
            </div>{" "}
            <div>
              {" "}
              <h2 className="text-xl font-bold text-slate-900">
                {" "}
                {isClosable
                  ? "Pengaturan Profil"
                  : "Wajib Lengkapi Profil"}{" "}
              </h2>{" "}
              <p className="text-xs text-slate-400">
                {" "}
                {isClosable
                  ? "Perbarui data diri Anda"
                  : "Data profil dibutuhkan sebelum mengakses sistem"}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <form onSubmit={handleSubmit} className="space-y-4">
            {" "}
            <div className="space-y-1.5">
              {" "}
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                {" "}
                <User className="w-3 h-3" /> Nama Lengkap *{" "}
              </Label>{" "}
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                placeholder="Sesuai KTP"
                required
              />{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-3">
              {" "}
              <div className="space-y-1.5">
                {" "}
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  {" "}
                  <Mail className="w-3 h-3" /> Email *{" "}
                </Label>{" "}
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@..."
                  required
                />{" "}
              </div>{" "}
              <div className="space-y-1.5">
                {" "}
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Phone className="w-3 h-3" /> No. HP *
                </Label>
                <div className="flex relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">
                    +62
                  </span>
                  <Input
                    type="tel"
                    inputMode="tel"
                    className="pl-11"
                    value={
                      form.phone.startsWith("+62")
                        ? form.phone.slice(3)
                        : form.phone.startsWith("62")
                          ? form.phone.slice(2)
                          : form.phone.startsWith("0")
                            ? form.phone.slice(1)
                            : form.phone
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setForm((f) => ({
                        ...f,
                        phone: `+62${digits}`,
                      }));
                    }}
                    placeholder="8123456..."
                    required
                  />
                </div>{" "}
              </div>{" "}
            </div>{" "}
            {user?.role === "participant" && (
              <div className="space-y-1.5">
                {" "}
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  {" "}
                  <Hash className="w-3 h-3" /> NIK (16 digit) *{" "}
                </Label>{" "}
                <Input
                  inputMode="numeric"
                  value={form.nik}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nik: e.target.value.replace(/\D/g, "").slice(0, 16),
                    }))
                  }
                  placeholder="16 digit angka NIK"
                  required
                />{" "}
              </div>
            )}{" "}
            <Button
              type="submit"
              disabled={saving || loadingProfile}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                "Menyimpan..."
              ) : loadingProfile ? (
                "Memuat profil..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                </>
              )}
            </Button>
          </form>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}


