import { readFileSync } from "fs";
import { join } from "path";
import * as React from "react";

export type CertificateRenderData = {
  participantName: string;
  certificateNumber: string;
  trainingName: string;
  trainingField: string;
  issuedAt: string;
  walletAddress: string;
};

let cachedTemplateDataUri: string | null = null;

function readTemplateDataUri() {
  if (cachedTemplateDataUri) return cachedTemplateDataUri;
  const candidates = [
    join(process.cwd(), "public", "certificate_template.png"),
    join(process.cwd(), "src", "app", "api", "admin", "preview-certificate", "certificate_template.png"),
    join(process.cwd(), "src", "app", "api", "admin", "mint", "certificate_template.png"),
  ];
  for (const filePath of candidates) {
    try {
      const bytes = readFileSync(filePath);
      cachedTemplateDataUri = `data:image/png;base64,${bytes.toString("base64")}`;
      return cachedTemplateDataUri;
    } catch {}
  }
  throw new Error("Template sertifikat tidak ditemukan.");
}

export function formatIssuedDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function shortenWallet(value: string) {
  return value.length > 15 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function splitName(value: string, maxLength = 24) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["Peserta"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

export function CertificateRenderTemplate({ data, size = 1200 }: { data: CertificateRenderData; size?: number; }) {
  const background = readTemplateDataUri();
  const nameLines = splitName(data.participantName);
  const certNo = data.certificateNumber;
  const dateText = formatIssuedDate(data.issuedAt);
  const walletText = shortenWallet(data.walletAddress);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", backgroundColor: "#0f172a" }}>
      <img src={background} alt="Template Sertifikat" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      <div style={{ position: "absolute", top: "2%", left: "10%", right: "8%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "rgba(255,255,255,0.72)", fontFamily: "Poppins, Arial, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 6 }}>NOMOR SERTIFIKAT</div>
        <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: "#ffffff", fontFamily: "monospace" }}>{certNo}</div>
      </div>
      <div style={{ position: "absolute", top: "44%", left: "33%", right: "5%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#ffffff", fontFamily: "Poppins, Arial, sans-serif", lineHeight: 1.05 }}>
        <div style={{ fontSize: 60, fontWeight: 800 }}>{nameLines[0]}</div>
        {nameLines[1] ? <div style={{ marginTop: 6, fontSize: 60, fontWeight: 800 }}>{nameLines[1]}</div> : null}
      </div>
      <div style={{ position: "absolute", top: "65%", left: "47.8%", right: "5%", display: "flex", justifyContent: "center", textAlign: "center", color: "rgba(255,255,255,0.82)", fontFamily: "Poppins, Arial, sans-serif", fontSize: 22 }}>{data.trainingField}</div>
      <div style={{ position: "absolute", top: "69%", left: "30%", right: "5%", display: "flex", justifyContent: "center", textAlign: "center", color: "#ffffff", fontFamily: "Poppins, Arial, sans-serif", fontSize: 40, fontWeight: 700 }}>{data.trainingName}</div>
      <div style={{ position: "absolute", bottom: "18%", left: "40%", width: "25%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#ffffff", fontFamily: "Poppins, Arial, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>Tanggal Terbit</div>
        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>{dateText}</div>
      </div>
      <div style={{ position: "absolute", bottom: "18%", left: "61%", width: "25%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#ffffff", fontFamily: "Poppins, Arial, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>Wallet Peserta</div>
        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{walletText}</div>
      </div>
    </div>
  );
}
