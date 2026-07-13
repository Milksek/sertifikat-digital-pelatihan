"use client";
import { useState, useEffect, Suspense , startTransition} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Award,
  ChevronRight,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  CreditCard,
  ArrowRight,
  X,
} from "lucide-react";
import { isAdminWallet } from "@/lib/admin-wallets";

function RegisterPopup({
  walletAddress,
  userId,
  onSuccess,
  onClose,
}: {
  walletAddress: string;
  userId: string;
  onSuccess: (role: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    nik: "",
    roleType: isAdminWallet(walletAddress) ? "admin" : "participant",
  });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone) {
      toast.error("Lengkapi semua field wajib");
      return;
    }
    if (form.roleType === "participant" && form.nik.length !== 16) {
      toast.error("NIK harus 16 digit");
      return;
    }
    try {
      setSaving(true);
      const newProfile = {
        id: userId,
        wallet_address: walletAddress.toLowerCase(),
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        nik: form.nik,
        role: form.roleType,
      };
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          nik: form.nik,
          role: form.roleType,
        }),
      });
      const result = await res.json().catch(() => ({ error: "Gagal menyimpan" }));
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan");
      if (result.accessToken) {
        localStorage.setItem("ssdp_token", result.accessToken);
      }
      const mergedProfile = { ...newProfile, ...(result.profile || {}) };
      localStorage.setItem("ssdp_profile", JSON.stringify(mergedProfile));
      localStorage.setItem("ssdp_role", result.role || newProfile.role);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ssdp_auth_change"));
      }
      toast.success("Profil berhasil disimpan!");
      onSuccess(result.role || form.roleType);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-7">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
          aria-label="Tutup dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-6">
          <div className="space-y-3 pr-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Wallet baru terdeteksi
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Lengkapi profil</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Isi data peserta agar akun bisa langsung dipakai untuk penilaian dan penerbitan sertifikat.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Wallet aktif</p>
            <p className="mt-2 truncate font-mono text-xs text-slate-700">{walletAddress}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <User className="h-3.5 w-3.5" /> Nama lengkap
              </Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Sesuai KTP"
                className="h-11 rounded-2xl border-slate-200 px-4"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="nama@contoh.com"
                  className="h-11 rounded-2xl border-slate-200 px-4"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Phone className="h-3.5 w-3.5" /> Telepon
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm font-semibold text-slate-500">+62</span>
                  <Input
                    value={form.phone}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, "");
                      if (onlyNumbers.startsWith("0")) {
                        setForm((f) => ({ ...f, phone: onlyNumbers.substring(1) }));
                      } else {
                        setForm((f) => ({ ...f, phone: onlyNumbers }));
                      }
                    }}
                    placeholder="8xxxxxxxxxx"
                    className="h-11 rounded-2xl border-slate-200 pl-14 pr-4"
                    required
                  />
                </div>
              </div>
            </div>

            {!isAdminWallet(walletAddress) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Peran akun</Label>
                <RadioGroup
                  value={form.roleType}
                  onValueChange={(v) => setForm((f) => ({ ...f, roleType: v }))}
                  className="mt-3"
                >
                  <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                    <RadioGroupItem value="participant" id="r-participant" className="mt-1" />
                    <Label htmlFor="r-participant" className="cursor-pointer space-y-1">
                      <span className="block text-sm font-semibold text-slate-900">Peserta</span>
                      <span className="block text-xs leading-5 text-slate-500">Digunakan untuk pelatihan Junior Web Developer.</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {form.roleType === "participant" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <CreditCard className="h-3.5 w-3.5" /> NIK
                </Label>
                <Input
                  value={form.nik}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, "");
                    setForm((f) => ({ ...f, nik: onlyNumbers }));
                  }}
                  placeholder="16 digit NIK"
                  maxLength={16}
                  className="h-11 rounded-2xl border-slate-200 px-4"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full rounded-2xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Simpan dan lanjutkan
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
function LoginContent() {
  const {
    walletAddress,
    isConnecting,
    isModalConnecting,
    isSigning,
    connectWallet,
  } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showRegister, setShowRegister] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  useEffect(() => {
    const register = searchParams.get("register");
    const userId = searchParams.get("userId");
    let isProfileComplete = false;

    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ssdp_profile");
        if (cached) {
          const profile = JSON.parse(cached);
          const isWalletAdmin = isAdminWallet(walletAddress);
          isProfileComplete = Boolean(
            profile?.full_name &&
            profile?.email &&
            profile?.phone &&
            (isWalletAdmin || (profile?.nik && String(profile.nik).length === 16)),
          );
        }
      } catch {}
    }

    if (register === "1" && userId && walletAddress && !isProfileComplete) {
      startTransition(() => {
        setPendingUserId(userId);
        setShowRegister(true);
      });
      return;
    }

    startTransition(() => { setShowRegister(false); });
  }, [searchParams, walletAddress]);
  const redirectByRole = (role: string, userId?: string) => {
    const route =
      role === "admin"
        ? "/admin/dashboard"
        : role === "assessor"
          ? "/assessor/dashboard"
          : "/participant/dashboard";
    if (typeof window !== "undefined") {
      if (userId) {
        sessionStorage.setItem("ssdp_onboarding_done", userId);
      }
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("register");
      cleanUrl.searchParams.delete("userId");
      window.history.replaceState({}, "", cleanUrl.pathname || "/login");
      window.location.replace(route);
      return;
    }
    router.prefetch(route);
    router.push(route);
  };
  useEffect(() => {
    router.prefetch("/participant/dashboard");
    router.prefetch("/admin/dashboard");
    router.prefetch("/assessor/dashboard");
  }, [router]);
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.24),_transparent_34%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl text-center">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-950/30">
            <Award className="h-7 w-7 text-white" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">Portal Masuk</p>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Sistem Sertifikat Digital Pelatihan
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
              Hubungkan wallet MetaMask untuk masuk ke portal pelatihan Junior Web Developer dan lanjut ke dashboard sesuai peran.
            </p>
          </div>
        </div>

        <div className="mt-10 w-full max-w-md rounded-[28px] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-7">
          <div className="space-y-5">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-100">
                <span className="h-2 w-2 rounded-full bg-blue-300 animate-pulse" />
                Autentikasi Wallet
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {isSigning ? "Konfirmasi tanda tangan" : isModalConnecting ? "Membuka wallet" : "Masuk ke portal"}
              </h2>
              <p className="text-sm leading-6 text-slate-300">
                {isSigning
                  ? "Periksa MetaMask lalu tanda tangani pesan untuk menyelesaikan login."
                  : isModalConnecting
                    ? "Pilih akun yang akan digunakan untuk masuk ke sistem."
                    : "Satu tombol untuk login dan pendaftaran awal peserta secara otomatis."}
              </p>
            </div>

            {isConnecting && (
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-left text-blue-100">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSigning ? "Menunggu tanda tangan" : "Menunggu wallet"}
                </div>
                <p className="mt-2 text-xs leading-5 text-blue-100/80">
                  {isSigning ? "Tanda tangani pesan di MetaMask untuk melanjutkan." : "Pilih wallet pada jendela koneksi yang muncul."}
                </p>
              </div>
            )}

            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="h-12 w-full rounded-2xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSigning ? "Menunggu tanda tangan..." : "Membuka koneksi..."}
                </>
              ) : (
                <>
                  Hubungkan Wallet MetaMask
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="space-y-2 rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3 text-left text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" />
                <span>Tanpa kata sandi, cukup verifikasi wallet.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" />
                <span>Peserta baru akan diarahkan ke form profil secara otomatis.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" />
                <span>Setelah masuk, sistem akan mengarahkan Anda ke dashboard sesuai peran.</span>
              </div>
            </div>
          </div>
        </div>

        <a
          href="/verify"
          className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          Verifikasi sertifikat publik <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      {showRegister && walletAddress && (
        <RegisterPopup
          walletAddress={walletAddress}
          userId={pendingUserId}
          onSuccess={(role) => {
            setShowRegister(false);
            toast.success("Selamat datang di Sistem Sertifikat Digital Pelatihan!");
            redirectByRole(role, pendingUserId);
          }}
          onClose={() => setShowRegister(false)}
        />
      )}
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}



