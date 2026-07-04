"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useActiveAccount } from "thirdweb/react";
import { toast } from "sonner";
import { Shield, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export default function RegisterPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    nik: "",
    institution: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const account = useActiveAccount();
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.full_name) {
        if (role === "admin") router.push("/admin/dashboard");
        else if (role === "assessor") router.push("/assessor/dashboard");
        else router.push("/participant/dashboard");
      }
    }
  }, [user, role, isLoading, router]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleRoleChange = (_value: string) => {}; 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast.error("Harap isi semua kolom wajib");
      return;
    }
    if (formData.nik.length !== 16) {
      toast.error("NIK harus terdiri dari 16 digit");
      return;
    }
    try {
      setIsSubmitting(true);
      // Fatal 3: Use server-side API instead of direct Supabase update (RLS blocks direct update)
      if (!account) throw new Error("Wallet tidak terkoneksi");

      const nonceRes = await fetch(`/api/auth/nonce?wallet=${account.address?.toLowerCase()}`);
      if (!nonceRes.ok) throw new Error("Gagal mengambil nonce login");
      const { message } = await nonceRes.json();

      const signature = await account.signMessage({ message });

      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          message,
          signature,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          nik: formData.nik,
        }),
      });
      const result = await res.json().catch(() => ({ error: "Server error" }));
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan data profil");

      if (result.accessToken) {
        localStorage.setItem("ssdp_token", result.accessToken);
      }
      if (result.profile) {
        localStorage.setItem("ssdp_profile", JSON.stringify(result.profile));
      }
      localStorage.setItem("ssdp_role", result.role || "participant");
      toast.success("Registrasi berhasil!");
      window.location.href = "/participant/dashboard";
    } catch (error: unknown) {
      console.error(error);
      toast.error((error as any).message || "Gagal menyimpan data profil");
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isLoading || (user && user.full_name)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <Card className="w-full max-w-lg relative z-10 shadow-xl border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <User className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Lengkapi Profil Anda
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Wallet Anda terdeteksi sebagai akun baru. Lengkapi data diri untuk
              mendaftar sebagai <strong>peserta</strong>.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Masukkan nama sesuai KTP"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Nomor Telepon <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nik">
                  NIK KTP <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nik"
                  name="nik"
                  placeholder="Masukkan 16 digit NIK"
                  maxLength={16}
                  value={formData.nik}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-slate-500">
                  NIK wajib diisi untuk penerbitan sertifikat.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">
                  Institusi / Organisasi (Opsional)
                </Label>
                <Input
                  id="institution"
                  name="institution"
                  placeholder="Nama instansi atau perusahaan"
                  value={formData.institution}
                  onChange={handleChange}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-6 text-lg font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Menyimpan Profil...
                </>
              ) : (
                "Selesaikan Registrasi"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

