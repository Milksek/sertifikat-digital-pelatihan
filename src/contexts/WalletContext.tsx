"use client";
import { createContext, useContext, ReactNode, useState } from "react";
import {
  useActiveAccount,
  useActiveWallet,
  useConnectModal,
  useDisconnect,
} from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";
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
const WalletContext = createContext<WalletContextType | undefined>(undefined);
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const { connect: openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const walletAddress = activeAccount?.address?.toLowerCase() ?? null;
  const connectWallet = async () => {
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
      const domain = window.location.host;
      const message = `Selamat datang di Portal KOMPETEN.ID!
───────────────
Verifikasi Kepemilikan Wallet
───────────────
Tanda tangan pesan ini untuk login ke sistem.
Tindakan ini aman, tidak memerlukan biaya gas (Bebas Biaya),
dan tidak akan mengubah atau memindahkan aset digital Anda.
Alamat URI  : ${domain}
Wallet Anda : ${address}
Timestamp   : ${Date.now()}`;
      await account.signMessage({ message });
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error ?? "Sync gagal");
      }
      const { role, isNewUser, userId, accessToken, profile } =
        await res.json();
      if (accessToken) {
        localStorage.setItem("kompetenid_token", accessToken);
      }
      if (profile) {
        localStorage.setItem("kompetenid_profile", JSON.stringify(profile));
        if (profile.role) {
          localStorage.setItem("kompetenid_role", profile.role);
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("kompetenid_auth_change"));
      }
      toast.success("Login berhasil!", {
        description: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });
      if (isNewUser) {
        router.push(`/login?register=1&userId=${userId}`);
        return;
      }
      if (role === "admin") router.push("/admin/dashboard");
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
    localStorage.removeItem("kompetenid_token");
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
