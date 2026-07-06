"use client";

import { useRef, useEffect, useState } from "react";

type PreviewInput = {
  participantName: string;
  certificateNumber: string;
  trainingName: string;
  trainingField: string;
  issuedAt: string;
  walletAddress: string;
};

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
}

function shortenWallet(addr: string) {
  return addr.length <= 15 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function splitName(name: string, maxLen = 28) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["Peserta"];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxLen || !cur) { cur = next; continue; }
    lines.push(cur);
    cur = w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

/** Renders certificate with real template PNG + SVG text overlay (client-side, no server) */
export function CertificatePreview({ input, onReady }: { input: PreviewInput; onReady?: (dataUri: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = splitName(input.participantName);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", lineHeight: 0 }}>
      <img
        src="/certificate-template.png"
        alt="Template Sertifikat"
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 12 }}
        onLoad={() => {
          if (!onReady || !containerRef.current) return;
          const img = containerRef.current.querySelector("img");
          const svg = containerRef.current.querySelector("svg");
          if (!img || !svg) return;
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
          svg.setAttribute("width", String(w));
          svg.setAttribute("height", String(h));

          const p = (pct: number) => Math.round(w * pct);

          svg.innerHTML = `
            <text x="${p(0.05)}" y="${p(0.05)}" fill="#94a3b8" font-size="${p(0.018)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">NOMOR SERTIFIKAT</text>
            <text x="${p(0.05)}" y="${p(0.09)}" fill="#ffffff" font-size="${p(0.025)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(input.certificateNumber)}</text>

            <text x="${p(0.45)}" y="${p(0.52)}" fill="#ffffff" font-size="${p(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(lines[0] ?? "Peserta")}</text>
            ${lines[1] ? `<text x="${p(0.45)}" y="${p(0.59)}" fill="#ffffff" font-size="${p(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(lines[1])}</text>` : ""}

            <text x="${p(0.45)}" y="${p(0.73)}" fill="#ffffff" font-size="${p(0.025)}" font-weight="600" font-family="Arial,Helvetica,sans-serif">${escapeSvg(input.trainingName)}</text>
            <text x="${p(0.70)}" y="${p(0.68)}" fill="#ffffff" font-size="${p(0.020)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${escapeSvg(input.trainingField)}</text>

            <text x="${p(0.45)}" y="${p(0.78)}" fill="#94a3b8" font-size="${p(0.015)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">TANGGAL TERBIT</text>
            <text x="${p(0.45)}" y="${p(0.81)}" fill="#ffffff" font-size="${p(0.020)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(formatDate(input.issuedAt))}</text>

            <text x="${p(0.65)}" y="${p(0.78)}" fill="#94a3b8" font-size="${p(0.015)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">WALLET PESERTA</text>
            <text x="${p(0.65)}" y="${p(0.81)}" fill="#ffffff" font-size="${p(0.020)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(shortenWallet(input.walletAddress))}</text>
          `;
        }}
      />
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      />
    </div>
  );
}

export function generatePreviewDataUri(input: PreviewInput) {
  const w = 2000, h = 2000;
  const lines = splitName(input.participantName);
  const p = (pct: number) => Math.round(w * pct);

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <text x="${p(0.05)}" y="${p(0.05)}" fill="#94a3b8" font-size="${p(0.018)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">NOMOR SERTIFIKAT</text>
  <text x="${p(0.05)}" y="${p(0.09)}" fill="#ffffff" font-size="${p(0.025)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(input.certificateNumber)}</text>
  <text x="${p(0.45)}" y="${p(0.52)}" fill="#ffffff" font-size="${p(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(lines[0] ?? "Peserta")}</text>
  ${lines[1] ? `<text x="${p(0.45)}" y="${p(0.59)}" fill="#ffffff" font-size="${p(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(lines[1])}</text>` : ""}
  <text x="${p(0.45)}" y="${p(0.73)}" fill="#ffffff" font-size="${p(0.025)}" font-weight="600" font-family="Arial,Helvetica,sans-serif">${escapeSvg(input.trainingName)}</text>
  <text x="${p(0.70)}" y="${p(0.68)}" fill="#ffffff" font-size="${p(0.020)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${escapeSvg(input.trainingField)}</text>
  <text x="${p(0.45)}" y="${p(0.78)}" fill="#94a3b8" font-size="${p(0.015)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">TANGGAL TERBIT</text>
  <text x="${p(0.45)}" y="${p(0.81)}" fill="#ffffff" font-size="${p(0.020)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(formatDate(input.issuedAt))}</text>
  <text x="${p(0.65)}" y="${p(0.78)}" fill="#94a3b8" font-size="${p(0.015)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">WALLET PESERTA</text>
  <text x="${p(0.65)}" y="${p(0.81)}" fill="#ffffff" font-size="${p(0.020)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(shortenWallet(input.walletAddress))}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
