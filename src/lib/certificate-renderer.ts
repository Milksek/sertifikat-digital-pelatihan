import sharp from "sharp";

type RenderCertificateInput = {
  participantName: string;
  certificateNumber: string;
  trainingName: string;
  trainingField: string;
  issuedAt: string;
  walletAddress: string;
  verifyUrl?: string;
};

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatIssuedDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function shortenWallet(value: string) {
  if (value.length <= 15) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function splitName(value: string, maxLen = 28) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Peserta"];
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

export async function renderCertificatePng(input: RenderCertificateInput) {
  const W = 1600, H = 1200;
  const nameLines = splitName(input.participantName).map(escapeSvg);

  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="40%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="24"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent)" rx="24"/>

  <!-- Left decorative panel -->
  <rect x="40" y="40" width="580" height="${H - 80}" fill="#1e293b" rx="16" stroke="#334155" stroke-width="1"/>

  <!-- Certificate icon area -->
  <circle cx="330" cy="220" r="80" fill="none" stroke="#10b981" stroke-width="3" opacity="0.3"/>
  <text x="330" y="200" text-anchor="middle" fill="#10b981" font-size="48" font-family="serif">&#127891;</text>
  <text x="330" y="250" text-anchor="middle" fill="#10b981" font-size="16" font-weight="600" font-family="sans-serif" letter-spacing="3">CERTIFICATE</text>

  <!-- Left panel info -->
  <text x="330" y="380" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="sans-serif" letter-spacing="2">NOMOR SERTIFIKAT</text>
  <text x="330" y="410" text-anchor="middle" fill="#f1f5f9" font-size="18" font-weight="700" font-family="monospace">${escapeSvg(input.certificateNumber)}</text>

  <line x1="140" y1="450" x2="520" y2="450" stroke="#334155" stroke-width="1"/>

  <text x="330" y="490" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="sans-serif" letter-spacing="2">TANGGAL TERBIT</text>
  <text x="330" y="520" text-anchor="middle" fill="#f1f5f9" font-size="16" font-weight="700" font-family="sans-serif">${escapeSvg(formatIssuedDate(input.issuedAt))}</text>

  <line x1="140" y1="560" x2="520" y2="560" stroke="#334155" stroke-width="1"/>

  <text x="330" y="600" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="sans-serif" letter-spacing="2">WALLET PESERTA</text>
  <text x="330" y="630" text-anchor="middle" fill="#f1f5f9" font-size="15" font-weight="700" font-family="monospace">${escapeSvg(shortenWallet(input.walletAddress))}</text>

  <line x1="140" y1="670" x2="520" y2="670" stroke="#334155" stroke-width="1"/>

  <text x="330" y="710" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="sans-serif" letter-spacing="2">JENIS TOKEN</text>
  <text x="330" y="740" text-anchor="middle" fill="#fbbf24" font-size="16" font-weight="700" font-family="sans-serif">Soulbound Token (SBT)</text>

  <!-- Vertical divider -->
  <line x1="660" y1="80" x2="660" y2="${H - 80}" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>

  <!-- Right panel - Main content -->
  <text x="${W / 2 + 200}" y="180" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="sans-serif" letter-spacing="4">DIBERIKAN KEPADA</text>

  <!-- Participant name -->
  <text x="${W / 2 + 200}" y="280" text-anchor="middle" fill="#f1f5f9" font-size="52" font-weight="700" font-family="sans-serif">${nameLines[0] ?? "Peserta"}</text>
  ${nameLines[1] ? `<text x="${W / 2 + 200}" y="340" text-anchor="middle" fill="#f1f5f9" font-size="52" font-weight="700" font-family="sans-serif">${nameLines[1]}</text>` : ""}

  <!-- Decorative line -->
  <line x1="${W / 2 + 200 - 250}" y1="${nameLines[1] ? 380 : 320}" x2="${W / 2 + 200 + 250}" y2="${nameLines[1] ? 380 : 320}" stroke="url(#accent)" stroke-width="3"/>

  <!-- Training info -->
  <text x="${W / 2 + 200}" y="${nameLines[1] ? 440 : 400}" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="sans-serif" letter-spacing="2">ATAS PENYELESAIAN PELATIHAN</text>

  <text x="${W / 2 + 200}" y="${nameLines[1] ? 510 : 470}" text-anchor="middle" fill="#10b981" font-size="32" font-weight="700" font-family="sans-serif">${escapeSvg(input.trainingName)}</text>

  <text x="${W / 2 + 200}" y="${nameLines[1] ? 560 : 520}" text-anchor="middle" fill="#64748b" font-size="18" font-family="sans-serif">Bidang: ${escapeSvg(input.trainingField)}</text>

  <!-- Publisher -->
  <text x="${W / 2 + 200}" y="${H - 180}" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="sans-serif" letter-spacing="2">DITERBITKAN OLEH</text>
  <text x="${W / 2 + 200}" y="${H - 140}" text-anchor="middle" fill="#f1f5f9" font-size="16" font-weight="700" font-family="sans-serif">Sistem Sertifikat Digital Pelatihan</text>
  <text x="${W / 2 + 200}" y="${H - 110}" text-anchor="middle" fill="#64748b" font-size="12" font-family="sans-serif">Terverifikasi secara on-chain di Polygon Amoy Testnet</text>

  <!-- Bottom accent line -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#accent)" rx="24"/>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
