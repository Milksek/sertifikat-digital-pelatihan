"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, getAuthenticatedClient } from "@/lib/supabase";
import {
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from "thirdweb/react";
import { useRouter } from "next/navigation";
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
async function fetchProfileById(id: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as UserProfile | null;
}
async function fetchProfileByWallet(
  wallet: string,
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();
  return data as UserProfile | null;
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  useEffect(() => {
    let mounted = true;
    const cachedProfile = localStorage.getItem("kompetenid_profile");
    if (cachedProfile && mounted) {
      try {
        const parsed = JSON.parse(cachedProfile);
        setUser(parsed);
        setRole(localStorage.getItem("kompetenid_role") as Role);
        setIsLoading(false);
      } catch (e) {}
    }
    const loadProfile = async (profile: UserProfile | null) => {
      if (!mounted) return;
      if (profile) {
        setUser(profile);
        setRole(profile.role as Role);
        localStorage.setItem("kompetenid_profile", JSON.stringify(profile));
        localStorage.setItem("kompetenid_role", profile.role as string);
      } else {
        setUser(null);
        setRole(null);
        localStorage.removeItem("kompetenid_profile");
        localStorage.removeItem("kompetenid_role");
      }
      setIsLoading(false);
    };
    const checkSession = async () => {
      if (!cachedProfile) setIsLoading(true);
      const token = localStorage.getItem("kompetenid_token");
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
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .maybeSingle();

            if (data && !error) {
              loadProfile(data as UserProfile);
              return;
            } else {
              if (cachedProfile) {
                setIsLoading(false);
                return;
              }
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
      loadProfile(null);
    };
    checkSession();
    const handleAuthChange = () => {
      if (mounted) checkSession();
    };
    window.addEventListener("kompetenid_auth_change", handleAuthChange);
    return () => {
      mounted = false;
      window.removeEventListener("kompetenid_auth_change", handleAuthChange);
    };
  }, []);
  const logout = () => {
    try {
      if (activeWallet) disconnect(activeWallet);
    } catch (e) {
      console.error("Thirdweb disconnect error:", e);
    }
    localStorage.removeItem("kompetenid_token");
    localStorage.removeItem("kompetenid_profile");
    localStorage.removeItem("kompetenid_role");
    window.location.href = "/login";
  };
  return (
    <AuthContext.Provider value={{ user, role, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
