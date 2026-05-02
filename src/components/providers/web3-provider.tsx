"use client";

import { ThirdwebProvider, AutoConnect } from "thirdweb/react";
import { client } from "@/lib/thirdweb";
import { createWallet } from "thirdweb/wallets";

const wallets = [createWallet("io.metamask")];

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <AutoConnect client={client} wallets={wallets} />
      {children}
    </ThirdwebProvider>
  );
}
