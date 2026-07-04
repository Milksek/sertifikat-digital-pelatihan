import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/web3-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/contexts/WalletContext";
import { APP_NAME } from "@/lib/app-config";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: `${APP_NAME} | Junior Web Developer`,
  description:
    "Platform penerbitan dan verifikasi sertifikat digital pelatihan Junior Web Developer berbasis Soulbound Token di Polygon Amoy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} ${inter.className} font-sans`}
      >
        <Web3Provider>
          <WalletProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </WalletProvider>
        </Web3Provider>
      </body>
    </html>
  );
}

