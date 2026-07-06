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

export function generatePreviewDataUri(input: PreviewInput) {
  const w = 1600, h = 1100;
  const lines = splitName(input.participantName);
  const sz = (pct: number) => Math.round(w * pct);

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e2e8f0" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#e2e8f0" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${w * 0.35}" height="${h}" fill="url(#accent)" opacity="0.3"/>
  <line x1="${w * 0.38}" y1="${h * 0.15}" x2="${w * 0.95}" y2="${h * 0.15}" stroke="#e2e8f0" stroke-opacity="0.15" stroke-width="1"/>
  <line x1="${w * 0.38}" y1="${h * 0.88}" x2="${w * 0.95}" y2="${h * 0.88}" stroke="#e2e8f0" stroke-opacity="0.15" stroke-width="1"/>
  <text x="${w * 0.05}" y="${h * 0.05}" fill="#94a3b8" font-size="${sz(0.013)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">NOMOR SERTIFIKAT</text>
  <text x="${w * 0.05}" y="${h * 0.09}" fill="#ffffff" font-size="${sz(0.018)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(input.certificateNumber)}</text>
  <text x="${w * 0.45}" y="${h * 0.28}" fill="#94a3b8" font-size="${sz(0.013)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">SERTIFIKAT</text>
  <text x="${w * 0.45}" y="${h * 0.35}" fill="#94a3b8" font-size="${sz(0.013)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="2">PELATIHAN KEAHLIAN PROFESIONAL</text>
  <text x="${w * 0.45}" y="${h * 0.42}" fill="#cbd5e1" font-size="${sz(0.013)}" font-family="Arial,Helvetica,sans-serif">Sertifikat ini dengan bangga diberikan kepada:</text>
  <text x="${w * 0.45}" y="${h * 0.52}" fill="#ffffff" font-size="${sz(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(lines[0] ?? "Peserta")}</text>
  ${lines[1] ? `<text x="${w * 0.45}" y="${h * 0.59}" fill="#ffffff" font-size="${sz(0.048)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(lines[1])}</text>` : ""}
  <rect x="${w * 0.45}" y="${h * 0.63}" width="${sz(0.14)}" height="${sz(0.035)}" rx="${sz(0.01)}" fill="#1e293b" stroke="#475569" stroke-width="1"/>
  <text x="${w * 0.52}" y="${h * 0.657}" fill="#e2e8f0" font-size="${sz(0.013)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">Sebagai: Peserta</text>
  <text x="${w * 0.45}" y="${h * 0.73}" fill="#ffffff" font-size="${sz(0.018)}" font-weight="600" font-family="Arial,Helvetica,sans-serif">${escapeSvg(input.trainingName)}</text>
  <text x="${w * 0.70}" y="${h * 0.68}" fill="#ffffff" font-size="${sz(0.015)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${escapeSvg(input.trainingField)}</text>
  <text x="${w * 0.45}" y="${h * 0.78}" fill="#94a3b8" font-size="${sz(0.011)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">TANGGAL TERBIT</text>
  <text x="${w * 0.45}" y="${h * 0.81}" fill="#ffffff" font-size="${sz(0.015)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(formatDate(input.issuedAt))}</text>
  <text x="${w * 0.65}" y="${h * 0.78}" fill="#94a3b8" font-size="${sz(0.011)}" font-weight="600" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">WALLET PESERTA</text>
  <text x="${w * 0.65}" y="${h * 0.81}" fill="#ffffff" font-size="${sz(0.015)}" font-weight="700" font-family="Arial,Helvetica,sans-serif">${escapeSvg(shortenWallet(input.walletAddress))}</text>
  <text x="${w * 0.95}" y="${h * 0.95}" fill="#475569" font-size="${sz(0.009)}" font-family="Arial,Helvetica,sans-serif" text-anchor="end">Sistem Sertifikat Digital Pelatihan</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
