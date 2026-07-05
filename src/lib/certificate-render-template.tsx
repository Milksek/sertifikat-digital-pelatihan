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
    } catch { }
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
      <div style={{ position: "absolute", top: "2%", left: "5%", right: "35%", display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", color: "rgba(255,255,255,0.72)", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>NOMOR SERTIFIKAT</div>
        <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>{certNo}</div>
      </div>
      <div style={{ position: "absolute", top: "48%", left: "33%", right: "13%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.02 }}>
        <div style={{ fontSize: 49, fontWeight: 700 }}>{nameLines[0]}</div>
        {nameLines[1] ? <div style={{ marginTop: 3, fontSize: 49, fontWeight: 700 }}>{nameLines[1]}</div> : null}
      </div>
      <div style={{ position: "absolute", top: "66.2%", left: "51%", right: "13%", display: "flex", justifyContent: "center", textAlign: "center", color: "rgba(255,255,255,0.82)", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 20 }}>{data.trainingField}</div>
      <div style={{ position: "absolute", top: "70.5%", left: "100%", right: "13%", display: "flex", justifyContent: "center", textAlign: "center", color: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 28, fontWeight: 700 }}>{data.trainingName}</div>
      <div style={{ position: "absolute", bottom: "20%", left: "45%", width: "16%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>Tanggal Terbit</div>
        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700 }}>{dateText}</div>
      </div>
      <div style={{ position: "absolute", bottom: "20%", left: "65%", width: "16%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>Wallet Peserta</div>
        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{walletText}</div>
      </div>
    </div>
  );
}

