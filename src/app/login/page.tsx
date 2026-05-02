"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/lib/supabase";
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
const MASTER_WALLET = "0x1cb90a414ade635dcfa78e41a825c789edde4d8e";

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
    roleType: walletAddress === MASTER_WALLET ? "admin" : "participant",
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
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: newProfile.full_name,
          email: newProfile.email,
          phone: newProfile.phone,
          nik: newProfile.nik,
          role: newProfile.role,
        })
        .eq("id", userId);
      if (error) throw error;
      localStorage.setItem("kompetenid_profile", JSON.stringify(newProfile));
      localStorage.setItem("kompetenid_role", newProfile.role);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("kompetenid_auth_change"));
      }
      toast.success("Profil berhasil disimpan!");
      onSuccess(form.roleType);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Lengkapi Profil
              </h2>
              <p className="text-xs text-slate-400">
                Wallet baru terdeteksi — daftar sekarang
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-xs text-slate-600 truncate">
              {walletAddress}
            </span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <User className="w-3 h-3" /> Nama Lengkap *
              </Label>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                placeholder="Sesuai KTP"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Mail className="w-3 h-3" /> Email *
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@contoh.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Phone className="w-3 h-3" /> Telepon *
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-medium text-sm border-r border-slate-300 pr-2 pb-0.5">
                    +62
                  </span>
                  <Input
                    value={form.phone}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, "");
                      if (onlyNumbers.startsWith("0")) {
                        setForm((f) => ({
                          ...f,
                          phone: onlyNumbers.substring(1),
                        }));
                      } else {
                        setForm((f) => ({ ...f, phone: onlyNumbers }));
                      }
                    }}
                    placeholder="8xxxxxxxxxx"
                    className="pl-14"
                    required
                  />
                </div>
              </div>
            </div>
            {walletAddress !== MASTER_WALLET && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">
                  Daftar sebagai
                </Label>
                <RadioGroup
                  value={form.roleType}
                  onValueChange={(v) => setForm((f) => ({ ...f, roleType: v }))}
                  className="grid grid-cols-2 gap-2"
                >
                  {[
                    { value: "participant", label: "Peserta" },
                  ].map((r) => (
                    <div
                      key={r.value}
                      className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${form.roleType === r.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      <RadioGroupItem value={r.value} id={`r-${r.value}`} />
                      <Label
                        htmlFor={`r-${r.value}`}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {r.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
            {form.roleType === "participant" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <CreditCard className="w-3 h-3" /> NIK KTP *
                </Label>
                <Input
                  value={form.nik}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, "");
                    setForm((f) => ({ ...f, nik: onlyNumbers }));
                  }}
                  placeholder="16 digit NIK"
                  maxLength={16}
                  required
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-semibold gap-2 mt-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Selesaikan Pendaftaran
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
    if (register === "1" && userId && walletAddress) {
      setPendingUserId(userId);
      setShowRegister(true);
    }
  }, [searchParams, walletAddress]);
  const redirectByRole = (role: string) => {
    const route =
      role === "admin"
        ? "/admin/dashboard"
        : role === "assessor"
          ? "/assessor/dashboard"
          : "/participant/dashboard";
    router.prefetch(route);
    router.push(route);
  };
  useEffect(() => {
    router.prefetch("/participant/dashboard");
    router.prefetch("/admin/dashboard");
    router.prefetch("/assessor/dashboard");
  }, [router]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500 opacity-10 blur-3xl animate-blob" />
        <div className="absolute top-40 -left-20 w-80 h-80 rounded-full bg-indigo-400 opacity-10 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-20 right-20 w-96 h-96 rounded-full bg-violet-500 opacity-10 blur-3xl animate-blob animation-delay-4000" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm px-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/30">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              KOMPETEN.ID
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Identitas Kompetensi Anda, Terjamin di Blockchain
          </p>
        </div>
        <div className="w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />{" "}
              Web3 Authentication
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {isSigning
                ? "Menandatangani..."
                : isModalConnecting
                  ? "Membuka Wallet..."
                  : "Masuk ke Portal"}
            </h2>
            <p className="text-slate-400 text-sm">
              {isSigning
                ? "Harap tanda tangani pesan di wallet Anda"
                : isModalConnecting
                  ? "Pilih akun di popup MetaMask"
                  : "Hubungkan wallet MetaMask untuk login atau daftar otomatis"}
            </p>
          </div>
          {isConnecting && (
            <div className="flex flex-col items-center justify-center gap-2 mb-5 p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  {isSigning ? "Menunggu Tanda Tangan" : "Menunggu Wallet"}
                </span>
              </div>
              <p className="text-xs text-blue-400/70 mt-1 text-center">
                {isSigning
                  ? "Cek popup MetaMask untuk sign message"
                  : "Pilih wallet di modal Thirdweb"}
              </p>
            </div>
          )}
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white gap-2 transition-all relative overflow-hidden group"
          >
            {isConnecting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isSigning ? "Sign Message..." : "Loading Modal..."}
              </div>
            ) : (
              "🔗 Hubungkan Wallet MetaMask"
            )}
            {!isConnecting && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            )}
          </Button>
          <div className="mt-6 space-y-2">
            {[
              "Login dan daftar dari satu tombol yang sama",
              "Tanda tangan kriptografis — tanpa password",
              "Redirect otomatis ke dashboard sesuai role",
            ].map((feat, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 text-xs text-slate-400"
              >
                <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                {feat}
              </div>
            ))}
          </div>
        </div>
        <a
          href="/verify"
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          Verifikasi sertifikat publik <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
      {showRegister && walletAddress && (
        <RegisterPopup
          walletAddress={walletAddress}
          userId={pendingUserId}
          onSuccess={(role) => {
            setShowRegister(false);
            toast.success("Selamat datang di KOMPETEN.ID!");
            redirectByRole(role);
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
