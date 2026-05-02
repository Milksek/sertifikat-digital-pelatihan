"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useState, useEffect } from "react";
import { ProfileSettingsModal } from "@/components/profile-settings-modal";
import { supabase } from "@/lib/supabase";
import {
  Activity,
  Building2,
  BookOpen,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
export function Sidebar() {
  const pathname = usePathname();
  const { role, user, logout } = useAuth();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || role !== "participant") return;
    supabase
      .from("assessments")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", user.id)
      .in("status", ["evaluated", "approved"])
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [user, role]);

  const routes = {
    admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Skema Sertifikasi", href: "/admin/schemes", icon: Building2 },
      { name: "Kelola Asesor", href: "/admin/assessors", icon: Users },
      { name: "Kelola Peserta", href: "/admin/participants", icon: Users },
      {
        name: "Review Assessment",
        href: "/admin/assessments",
        icon: FileCheck,
      },
      { name: "Mint Sertifikat NFT", href: "/admin/mint", icon: Hammer },
      {
        name: "Revoke Sertifikat",
        href: "/admin/revocations",
        icon: ShieldBan,
      },
      { name: "Log Aktivitas", href: "/admin/logs", icon: ScrollText },
    ],
    assessor: [
      { name: "Dashboard", href: "/assessor/dashboard", icon: LayoutDashboard },
      {
        name: "Evaluasi Peserta",
        href: "/assessor/evaluations",
        icon: Users,
      },
      {
        name: "Riwayat Penilaian",
        href: "/assessor/completed",
        icon: FileCheck,
      },
    ],
    participant: [
      {
        name: "Dashboard",
        href: "/participant/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Skema Sertifikasi",
        href: "/participant/schemes",
        icon: BookOpen,
      },
      {
        name: "Assessment Saya",
        href: "/participant/assessments",
        icon: GraduationCap,
      },
      {
        name: "Sertifikat NFT",
        href: "/participant/certificates",
        icon: Award,
      },
    ],
  };
  const navItems = role ? routes[role] : [];
  return (
    <>
      <aside className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col hidden md:flex fixed top-0 left-0 z-40">
        <div className="h-16 flex items-center justify-center font-bold text-xl text-white tracking-widest border-b border-slate-800">
          KOMPETEN.ID
        </div>
        <div className="flex-1 overflow-y-auto py-6">
          <div className="px-4 mb-6">
            <p className="text-xs uppercase font-semibold text-slate-500 tracking-wider mb-2">
              Menu Utama
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 h-5 w-5",
                        isActive ? "text-blue-200" : "text-slate-400",
                      )}
                    />
                    {item.name}
                    {role === "participant" &&
                      item.href === "/participant/assessments" &&
                      pendingCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="ml-3 overflow-hidden text-sm flex-1">
              <p className="text-white font-medium truncate">
                {user?.full_name}
              </p>
              <p className="text-slate-500 truncate capitalize">{role}</p>
            </div>
            <button
              onClick={() => setProfileOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              title="Pengaturan Profil"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <Button
            variant="outline"
            className="w-full border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <ProfileSettingsModal
        isOpen={isProfileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </>
  );
}
