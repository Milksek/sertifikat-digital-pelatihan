"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useState, useEffect, startTransition, useMemo } from "react";
import { ProfileSettingsModal } from "@/components/profile-settings-modal";
import { supabase } from "@/lib/supabase";
import { APP_NAME, TRAINING_NAME } from "@/lib/app-config";
import {
  LayoutDashboard,
  LogOut,
  Users,
  FileCheck,
  Award,
  ShieldBan,
  GraduationCap,
  ScrollText,
  Hammer,
  Settings,
  BookOpen,
  ShieldCheck,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Per-role accent config
const ROLE_THEME = {
  admin: {
    accent: "bg-blue-600",
    accentHover: "hover:bg-slate-800/80 hover:text-white",
    active: "border border-blue-500/40 bg-blue-600/90 text-white",
    activeIcon: "text-blue-100",
    badge: "border border-blue-500/30 bg-blue-500/10 text-blue-200",
    avatar: "bg-blue-600",
    accentSoft: "bg-blue-500/10 text-blue-200",
  },
  assessor: {
    accent: "bg-indigo-600",
    accentHover: "hover:bg-slate-800/80 hover:text-white",
    active: "border border-indigo-500/40 bg-indigo-600/90 text-white",
    activeIcon: "text-indigo-100",
    badge: "border border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
    avatar: "bg-indigo-600",
    accentSoft: "bg-indigo-500/10 text-indigo-200",
  },
  participant: {
    accent: "bg-emerald-600",
    accentHover: "hover:bg-slate-800/80 hover:text-white",
    active: "border border-emerald-500/40 bg-emerald-600/90 text-white",
    activeIcon: "text-emerald-100",
    badge: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    avatar: "bg-emerald-600",
    accentSoft: "bg-emerald-500/10 text-emerald-200",
  },
} as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  assessor: "Asesor",
  participant: "Peserta",
};

const PARTICIPANT_ASSESSMENTS_LAST_SEEN_KEY = "ssdp_participant_assessments_last_seen";


export function Sidebar() {
  const pathname = usePathname();
  const { role, user, logout } = useAuth();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const cachedProfile = useMemo(() => {
    if (!isHydrated || typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("ssdp_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [isHydrated]);

  const cachedRole = useMemo(() => {
    if (!isHydrated || typeof window === "undefined") return null;
    return localStorage.getItem("ssdp_role");
  }, [isHydrated]);

  const routeRoleFallback = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/assessor")
      ? "assessor"
      : pathname.startsWith("/participant")
        ? "participant"
        : null;

  const effectiveRole = (role || cachedRole || cachedProfile?.role || routeRoleFallback || null) as typeof role;
  const effectiveUser = user || cachedProfile;

  useEffect(() => {
    startTransition(() => { setIsHydrated(true); });
  }, []);

  // Derive resolved name from auth/cache, fallback to DB fetch
  useEffect(() => {
    if (!isHydrated) return;
    startTransition(() => { setResolvedName(null); });

    const fromAuth = effectiveUser?.full_name;
    if (fromAuth) {
      startTransition(() => { setResolvedName(fromAuth); });
      return;
    }
    const wallet = effectiveUser?.wallet_address;
    if (!wallet) return;
    supabase
      .from("profil")
      .select("full_name, email")
      .eq("wallet_address", wallet.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) startTransition(() => { setResolvedName(data.full_name); });
        else if (data?.email) startTransition(() => { setResolvedName(data.email.split("@")[0]); });
      });
  }, [effectiveUser?.wallet_address, effectiveUser?.full_name, effectiveUser?.email, effectiveRole, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !effectiveUser || effectiveRole !== "participant" || typeof window === "undefined") return;

    if (pathname === "/participant/assessments") {
      localStorage.setItem(PARTICIPANT_ASSESSMENTS_LAST_SEEN_KEY, new Date().toISOString());
      startTransition(() => {
        setPendingCount(0);
      });
      return;
    }

    const lastSeen = localStorage.getItem(PARTICIPANT_ASSESSMENTS_LAST_SEEN_KEY);
    let query = supabase
      .from("penilaian")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", effectiveUser.id)
      .in("status", ["evaluated", "approved"]);

    if (lastSeen) {
      query = query.gt("updated_at", lastSeen);
    }

    query.then(({ count }) => setPendingCount(count ?? 0));
  }, [effectiveUser, effectiveRole, isHydrated, pathname]);

  useEffect(() => {
    startTransition(() => { setMobileNavOpen(false); });
  }, [pathname]);

  const routes = {
    admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Kelola Asesor", href: "/admin/assessors", icon: ShieldCheck },
      { name: "Kelola Peserta", href: "/admin/participants", icon: Users },
      { name: "Data Penilaian", href: "/admin/assessments", icon: FileCheck },
      { name: "Penerbitan Sertifikat", href: "/admin/mint", icon: Hammer },
      { name: "Pencabutan Sertifikat", href: "/admin/revocations", icon: ShieldBan },
      { name: "Log Aktivitas", href: "/admin/logs", icon: ScrollText },
    ],
    assessor: [
      { name: "Dashboard", href: "/assessor/dashboard", icon: LayoutDashboard },
      { name: "Penilaian Aktif", href: "/assessor/evaluations", icon: FileCheck },
      { name: "Riwayat Penilaian", href: "/assessor/completed", icon: BookOpen },
    ],
    participant: [
      { name: "Dashboard", href: "/participant/dashboard", icon: LayoutDashboard },
      { name: "Informasi Pelatihan", href: "/participant/schemes", icon: GraduationCap },
      { name: "Penilaian Saya", href: "/participant/assessments", icon: FileCheck },
      { name: "Sertifikat Saya", href: "/participant/certificates", icon: Award },
    ],
  } as const;

  const navItems = effectiveRole ? routes[effectiveRole] : [];
  const theme = effectiveRole ? ROLE_THEME[effectiveRole] : ROLE_THEME.admin;

  const displayName =
    resolvedName ||
    effectiveUser?.full_name ||
    effectiveUser?.email?.split("@")[0] ||
    null;

  const avatarLetter =
    displayName?.charAt(0)?.toUpperCase() ||
    ROLE_LABEL[effectiveRole || ""]?.charAt(0)?.toUpperCase() ||
    "U";

  const shortWallet = (w?: string | null) =>
    w ? `${w.slice(0, 6)}...${w.slice(-4)}` : null;

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">SSDP</p>
            <p className="truncate text-sm font-semibold text-slate-900">{ROLE_LABEL[effectiveRole || ""] || "Dashboard"}</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Buka navigasi"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55"
            aria-label="Tutup navigasi"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-[320px] flex-col border-r border-slate-800 bg-slate-950 text-slate-300 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">SSDP</p>
                <p className="mt-1 text-sm font-semibold text-white">{APP_NAME}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300"
                aria-label="Tutup navigasi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pt-4">
              <div className={cn("rounded-2xl px-3 py-3", theme.badge)}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Pelatihan aktif</p>
                <p className="mt-1 text-sm font-semibold">{TRAINING_NAME}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={`mobile-${item.name}`}
                      href={item.href}
                      prefetch={true}
                      className={cn(
                        "group flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-150",
                        isActive
                          ? cn(theme.active, "shadow-sm")
                          : cn("border border-transparent text-slate-400 hover:border-slate-800 hover:text-white", theme.accentHover),
                      )}
                    >
                      <Icon
                        className={cn(
                          "mr-3 h-4 w-4 shrink-0 transition-colors",
                          isActive ? theme.activeIcon : "text-slate-500 group-hover:text-slate-300",
                        )}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                      {effectiveRole === "participant" &&
                        item.href === "/participant/assessments" &&
                        pendingCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {pendingCount > 9 ? "9+" : pendingCount}
                          </span>
                        )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-slate-800 p-4 space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <p className="truncate text-sm font-semibold text-white">
                  {displayName || (effectiveRole === "admin" ? "Admin" : effectiveRole === "assessor" ? "Asesor" : "Peserta")}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {ROLE_LABEL[effectiveRole || ""] || "Pengguna"}
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full border-slate-800 bg-transparent text-slate-300 hover:bg-slate-900 hover:text-white"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-300 md:flex">
        <div className="border-b border-slate-800 px-4 py-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">SSDP</p>
            <p className="mt-1 text-sm font-semibold text-white">{APP_NAME}</p>
            <p className="mt-1 text-xs text-slate-500">Portal sertifikat digital untuk sertifikat digital pelatihan.</p>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className={cn("rounded-2xl px-3 py-3", theme.badge)}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Pelatihan aktif</p>
            <p className="mt-1 text-sm font-semibold">{TRAINING_NAME}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Navigasi
            </p>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      "group flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-150",
                      isActive
                        ? cn(theme.active, "shadow-sm")
                        : cn("border border-transparent text-slate-400 hover:border-slate-800 hover:text-white", theme.accentHover),
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 h-4 w-4 shrink-0 transition-colors",
                        isActive ? theme.activeIcon : "text-slate-500 group-hover:text-slate-300",
                      )}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    {effectiveRole === "participant" &&
                      item.href === "/participant/assessments" &&
                      pendingCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="flex items-center gap-3">
              <div
                suppressHydrationWarning
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white",
                  theme.avatar,
                )}
              >
                {avatarLetter}
              </div>
              <div className="min-w-0 flex-1">
                <p suppressHydrationWarning className="truncate text-sm font-semibold text-white leading-tight">
                  {displayName || (effectiveRole === "admin" ? "Admin" : effectiveRole === "assessor" ? "Asesor" : "Peserta")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {ROLE_LABEL[effectiveRole || ""] || "Pengguna"}
                </p>
              </div>
              <button
                onClick={() => setProfileOpen(true)}
                className="shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                title="Pengaturan Profil"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {isHydrated && effectiveUser?.wallet_address ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <Wallet className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <p className="font-mono text-[11px] text-slate-400 truncate">
                  {shortWallet(effectiveUser.wallet_address)}
                </p>
              </div>
            ) : null}
          </div>

          <Button
            variant="outline"
            className="w-full border-slate-800 bg-transparent text-slate-300 hover:bg-slate-900 hover:text-white"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>
      <ProfileSettingsModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

