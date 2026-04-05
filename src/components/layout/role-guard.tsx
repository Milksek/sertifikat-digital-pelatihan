"use client";
import { useAuth, Role } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ProfileSettingsModal } from "@/components/profile-settings-modal";
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}
export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!allowedRoles.includes(role)) {
        if (role === "admin") router.push("/admin/dashboard");
        else if (role === "assessor") router.push("/assessor/dashboard");
        else router.push("/participant/dashboard");
      }
    }
  }, [user, role, isLoading, router, allowedRoles]);
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!user || !allowedRoles.includes(role)) {
    return null;
  }
  const MASTER_WALLET = "0x1cb90a414ade635dcfa78e41a825c789edde4d8e";
  const isProfileIncomplete =
    user &&
    user.wallet_address?.toLowerCase() !== MASTER_WALLET &&
    (!user.full_name ||
      !user.email ||
      !user.phone ||
      (user.role === "participant" && (!user.nik || user.nik.length !== 16)));
  return (
    <>
      {children}
      {isProfileIncomplete && (
        <ProfileSettingsModal
          isOpen={true}
          isClosable={false}
          onClose={() => {}}
        />
      )}
    </>
  );
}
