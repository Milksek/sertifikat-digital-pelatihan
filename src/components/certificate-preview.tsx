"use client";

import { useRef, useState } from "react";

type PreviewInput = {
  participantName: string;
  certificateNumber: string;
  trainingName: string;
  trainingField: string;
  issuedAt: string;
  walletAddress: string;
};

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
}

function shortAddr(a: string) {
  return a.length <= 15 ? a : `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function splitName(name: string, max = 28) {
  const ws = name.trim().split(/\s+/).filter(Boolean);
  if (!ws.length) return ["Peserta"];
  const out: string[] = [];
  let c = "";
  for (const w of ws) {
    const n = c ? `${c} ${w}` : w;
    if (n.length <= max || !c) { c = n; continue; }
    out.push(c);
    c = w;
  }
  if (c) out.push(c);
  return out.slice(0, 2);
}

function buildSvgText(input: PreviewInput, w: number, h: number) {
  const lines = splitName(input.participantName);
  const p = (pct: number) => Math.round(w * pct);
  const fs = (pct: number) => Math.round(w * pct);
  return `
    <text x="${p(0.05)}" y="${p(0.035)}" fill="#ffffff" font-size="${fs(0.018)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">NOMOR SERTIFIKAT</text>
    <text x="${p(0.05)}" y="${p(0.07)}" fill="#ffffff" font-size="${fs(0.025)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${esc(input.certificateNumber)}</text>
    <text x="${p(0.45)}" y="${p(0.52)}" fill="#ffffff" font-size="${fs(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${esc(lines[0] ?? "Peserta")}</text>
    ${lines[1] ? `<text x="${p(0.45)}" y="${p(0.59)}" fill="#ffffff" font-size="${fs(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${esc(lines[1])}</text>` : ""}
    <text x="${p(0.45)}" y="${p(0.73)}" fill="#ffffff" font-size="${fs(0.025)}" font-weight="600" font-family="Arial,Helvetica,sans-serif">${esc(input.trainingName)}</text>
    <text x="${p(0.70)}" y="${p(0.68)}" fill="#ffffff" font-size="${fs(0.020)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${esc(input.trainingField)}</text>
    <text x="${p(0.45)}" y="${p(0.78)}" fill="#ffffff" font-size="${fs(0.015)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">TANGGAL TERBIT</text>
    <text x="${p(0.45)}" y="${p(0.81)}" fill="#ffffff" font-size="${fs(0.020)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${esc(fmtDate(input.issuedAt))}</text>
    <text x="${p(0.65)}" y="${p(0.78)}" fill="#ffffff" font-size="${fs(0.015)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">WALLET PESERTA</text>
    <text x="${p(0.65)}" y="${p(0.81)}" fill="#ffffff" font-size="${fs(0.020)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${esc(shortAddr(input.walletAddress))}</text>
  `;
}

/** Client-side certificate preview: real template PNG + SVG text overlay */
export function CertificatePreview({ input }: { input: PreviewInput }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", lineHeight: 0 }}>
      <img
        src="/certificate-template.png"
        alt="Template Sertifikat"
        style={{ width: "100%", height: "auto", display: "block" }}
        onLoad={(e) => {
          const img = e.currentTarget;
          setDims({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {dims && (
        <svg
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          xmlns="http://www.w3.org/2000/svg"
          dangerouslySetInnerHTML={{ __html: buildSvgText(input, dims.w, dims.h) }}
        />
      )}
    </div>
  );
}
