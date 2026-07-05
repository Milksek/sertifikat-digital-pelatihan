"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, getAuthenticatedClient } from "@/lib/supabase";
import {
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from "thirdweb/react";
import { useRouter } from "next/navigation";
const MASTER_WALLET = "0x1cb90a414ade635dcfa78e41a825c789edde4d8e";
export type Role = "participant" | "assessor" | "admin" | null;
interface UserProfile {
  id: string;
  wallet_address: string;
  full_name: string;
  role: Role;
  nik?: string;
  email?: string;
  phone?: string;
}
interface AuthContextType {
  user: UserProfile | null;
  role: Role;
  isLoading: boolean;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  logout: () => {},
});
function normalizeProfile(profile: UserProfile | null): UserProfile | null {
  if (!profile) return null;
  if (profile.wallet_address?.toLowerCase() === MASTER_WALLET) {
    return { ...profile, role: "admin" };
  }
  return profile;
}
async function fetchProfileById(id: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profil")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return normalizeProfile(data as UserProfile | null);
}
async function fetchProfileByWallet(
  wallet: string,
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profil")
    .select("*")
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();
  return normalizeProfile(data as UserProfile | null);
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("ssdp_profile");
      return cached ? normalizeProfile(JSON.parse(cached)) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState<Role>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("ssdp_profile");
      if (cached) {
        const parsed = normalizeProfile(JSON.parse(cached));
        return (parsed?.role ?? localStorage.getItem("ssdp_role")) as Role;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("ssdp_profile");
  });
  const cachedProfileRef = React.useRef(user);
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const activeWalletAddress = account?.address?.toLowerCase() ?? null;
  const { disconnect } = useDisconnect();
  const router = useRouter();
  useEffect(() => {
    cachedProfileRef.current = user;
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeWalletAddress) return;

    let cachedProfile: UserProfile | null = null;
    try {
      const raw = localStorage.getItem("ssdp_profile");
      cachedProfile = raw ? normalizeProfile(JSON.parse(raw)) : null;
    } catch {
      cachedProfile = null;
    }

    if (cachedProfile?.wallet_address && cachedProfile.wallet_address.toLowerCase() !== activeWalletAddress) {
      localStorage.removeItem("ssdp_token");
      localStorage.removeItem("ssdp_profile");
      localStorage.removeItem("ssdp_role");
      setUser(null);
      setRole(null);
      setIsLoading(false);
      window.dispatchEvent(new Event("ssdp_auth_change"));
    }
  }, [activeWalletAddress]);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async (profile: UserProfile | null) => {
      if (!mounted) return;
      const normalizedProfile = normalizeProfile(profile);
      if (normalizedProfile) {
        setUser(normalizedProfile);
        setRole(normalizedProfile.role as Role);
        localStorage.setItem("ssdp_profile", JSON.stringify(normalizedProfile));
        localStorage.setItem("ssdp_role", normalizedProfile.role as string);
      } else {
        setUser(null);
        setRole(null);
        localStorage.removeItem("ssdp_profile");
        localStorage.removeItem("ssdp_role");
      }
      setIsLoading(false);
    };
    const cachedProfile = cachedProfileRef.current;
    const redirectToLogin = () => {
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    };
    const checkSession = async () => {
      if (!cachedProfile) setIsLoading(true);
      const token = localStorage.getItem("ssdp_token");
      if (token) {
        try {
          const base64Url = token.split(".")[1];
          let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const pad = base64.length % 4;
          if (pad) {
            base64 += "=".repeat(4 - pad);
          }
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join(""),
          );
          const payload = JSON.parse(jsonPayload);
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.warn("Sesi telah berakhir (Token Expired)");
            loadProfile(null);
            return;
          }
          const userId = payload.sub;
          if (userId) {
            const { data, error } = await getAuthenticatedClient(token)
              .from("profil")
              .select("*")
              .eq("id", userId)
              .maybeSingle();

            if (data && !error) {
              const normalizedData = normalizeProfile(data as UserProfile);
              if (
                activeWalletAddress &&
                normalizedData?.wallet_address &&
                normalizedData.wallet_address.toLowerCase() !== activeWalletAddress
              ) {
                loadProfile(null);
                return;
              }
              loadProfile(normalizedData);
              return;
            }
            if (cachedProfile) {
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("Session revalidation failed:", e);
          if (cachedProfile) {
            setIsLoading(false);
            return;
          }
        }
      }
      if (cachedProfile) {
        if (
          activeWalletAddress &&
          cachedProfile.wallet_address &&
          cachedProfile.wallet_address.toLowerCase() !== activeWalletAddress
        ) {
          loadProfile(null);
          return;
        }
        setIsLoading(false);
        return;
      }
      loadProfile(null);
    };
    checkSession();
    const handleAuthChange = () => {
      if (mounted) checkSession();
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "ssdp_token" ||
        event.key === "ssdp_profile" ||
        event.key === "ssdp_role"
      ) {
        const hasToken = Boolean(localStorage.getItem("ssdp_token"));
        const hasProfile = Boolean(localStorage.getItem("ssdp_profile"));
        if (!hasToken && !hasProfile) {
          redirectToLogin();
        }
      }
    };
    const originalClear = Storage.prototype.clear;
    Storage.prototype.clear = function clearPatched() {
      originalClear.call(this);
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
      redirectToLogin();
    };
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function removeItemPatched(key: string) {
      originalRemoveItem.call(this, key);
      if (key === "ssdp_token" || key === "ssdp_profile" || key === "ssdp_role") {
        window.dispatchEvent(new StorageEvent("storage", { key }));
      }
    };
    window.addEventListener("ssdp_auth_change", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      mounted = false;
      Storage.prototype.clear = originalClear;
      Storage.prototype.removeItem = originalRemoveItem;
      window.removeEventListener("ssdp_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [activeWalletAddress]);
  const logout = () => {
    try {
      if (activeWallet) disconnect(activeWallet);
    } catch (e) {
      console.error("Thirdweb disconnect error:", e);
    }
    localStorage.removeItem("ssdp_token");
    localStorage.removeItem("ssdp_profile");
    localStorage.removeItem("ssdp_role");
    window.location.href = "/login";
  };
  return (
    <AuthContext.Provider value={{ user, role, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);


