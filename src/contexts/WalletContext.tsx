"use client";
import { createContext, useContext, ReactNode, useState } from "react";
import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useConnectModal,
  useDisconnect,
  useSwitchActiveWalletChain,
} from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { appChain, client, hasThirdwebClient } from "@/lib/thirdweb";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  isModalConnecting: boolean;
  isSigning: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const MASTER_WALLET = "0x1cb90a414ade635dcfa78e41a825c789edde4d8e";
const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const { connect: openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const switchActiveWalletChain = useSwitchActiveWalletChain();
  const router = useRouter();
  const walletAddress = activeAccount?.address?.toLowerCase() ?? null;

  const connectWallet = async () => {
    if (!hasThirdwebClient || !client) {
      toast.error("Konfigurasi wallet belum lengkap.", {
        description: "Isi NEXT_PUBLIC_THIRDWEB_CLIENT_ID agar fitur login wallet bisa dipakai.",
      });
      return;
    }
    if (isConnecting || isSigning) return;
    setIsConnecting(true);
    let connectedWallet;
    try {
      connectedWallet = await openConnectModal({
        client,
        wallets: [createWallet("io.metamask")],
      });
    } catch (err: unknown) {
      setIsConnecting(false);
      return;
    }
    if (!connectedWallet) {
      setIsConnecting(false);
      return;
    }
    try {
      setIsConnecting(false);
      setIsSigning(true);
      const account = connectedWallet.getAccount();
      const address = account?.address?.toLowerCase();
      if (!account || !address) throw new Error("Gagal mengambil data akun");

      const connectedChain = activeChain ?? connectedWallet.getChain();
      if (!connectedChain || connectedChain.id !== appChain.id) {
        toast.info("Pindah ke Polygon Amoy dulu", {
          description: "Login portal ini hanya menerima wallet pada network Polygon Amoy.",
        });
        await switchActiveWalletChain(appChain);
      }

      // Fetch server-generated nonce (30s TTL)
      const nonceRes = await fetch(`/api/auth/nonce?wallet=${address}`);
      if (!nonceRes.ok) {
        const nonceErr = await nonceRes.json().catch(() => ({}));
        throw new Error(nonceErr.error || "Gagal mengambil nonce");
      }
      const { message: nonceMessage } = await nonceRes.json();

      const signature = await account.signMessage({ message: nonceMessage });
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, message: nonceMessage, signature }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error ?? "Sync gagal");
      }
      const { role, isNewUser, userId, accessToken, profile } =
        await res.json();
      if (accessToken) {
        localStorage.setItem("ssdp_token", accessToken);
      }
      if (profile) {
        localStorage.setItem("ssdp_profile", JSON.stringify(profile));
        if (profile.role) {
          localStorage.setItem("ssdp_role", profile.role);
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ssdp_auth_change"));
      }
      toast.success("Login berhasil!", {
        description: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });
      const isAdminWallet = address === MASTER_WALLET || role === "admin";
      if (isNewUser && !isAdminWallet) {
        router.push(`/login?register=1&userId=${userId}`);
        return;
      }
      if (isAdminWallet) {
        window.location.replace("/admin/dashboard");
        return;
      }
      else if (role === "assessor") router.push("/assessor/dashboard");
      else router.push("/participant/dashboard");
    } catch (error: any) {
      if (!error) {
        toast.info("Login dibatalkan");
        return;
      }
      const isRejection =
        error.message?.includes("User rejected") ||
        error.message?.includes("user rejected") ||
        error.message?.includes("Proposal expired") ||
        error.message?.includes("User denied");
      toast.error(isRejection ? "Login Dibatalkan" : "Gagal Login", {
        description: isRejection ? undefined : error.message,
      });
    } finally {
      setIsSigning(false);
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    if (activeWallet) disconnect(activeWallet);
    localStorage.removeItem("ssdp_token");
    toast.info("Wallet terputus");
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnecting: isConnecting || isSigning,
        isModalConnecting: isConnecting,
        isSigning: isSigning,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
