"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth, Role } from "@/components/providers/auth-provider";
import { ProfileSettingsModal } from "@/components/profile-settings-modal";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

const MASTER_WALLET = "0x1cb90a414ade635dcfa78e41a825c789edde4d8e";

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  const cachedProfile = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("ssdp_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const cachedRole = (() => {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem("ssdp_role") as Role) || null;
  })();

  const hasLocalSession = (() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      localStorage.getItem("ssdp_token") ||
      localStorage.getItem("ssdp_profile") ||
      localStorage.getItem("ssdp_role"),
    );
  })();

  const effectiveUser = user ?? cachedProfile;
  const effectiveRole = (role ?? cachedRole ?? cachedProfile?.role ?? null) as Role;

  useEffect(() => {
    if (isLoading && !effectiveUser && !hasLocalSession) {
      return;
    }

    if (!effectiveUser) {
      if (!hasLocalSession) {
        router.replace("/login");
      }
      return;
    }

    if (!allowedRoles.includes(effectiveRole)) {
      const target =
        effectiveRole === "admin"
          ? "/admin/dashboard"
          : effectiveRole === "assessor"
            ? "/assessor/dashboard"
            : "/participant/dashboard";
      router.replace(target);
    }
  }, [allowedRoles, effectiveRole, effectiveUser, hasLocalSession, isLoading, router]);

  if (isLoading && !effectiveUser && !hasLocalSession) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!effectiveUser || !allowedRoles.includes(effectiveRole)) {
    return null;
  }

  const isProfileIncomplete =
    effectiveUser.wallet_address?.toLowerCase() !== MASTER_WALLET &&
    (!effectiveUser.full_name ||
      !effectiveUser.email ||
      !effectiveUser.phone ||
      (effectiveRole === "participant" && (!effectiveUser.nik || effectiveUser.nik.length !== 16)));

  return (
    <>
      {children}
      {isProfileIncomplete && (
        <ProfileSettingsModal isOpen={true} isClosable={false} onClose={() => {}} />
      )}
    </>
  );
}

