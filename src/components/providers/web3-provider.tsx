"use client";
import { ThirdwebProvider } from "thirdweb/react";
export function Web3Provider({ children }: { children: React.ReactNode }) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
