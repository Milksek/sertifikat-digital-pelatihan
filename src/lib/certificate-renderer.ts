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

function splitName(value: string, maxLength = 28) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Peserta"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength || !current) { current = next; continue; }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

export function renderCertificateSvg(input: RenderCertificateInput): string {
  const W = 1600, H = 1200;
  const participantLines = splitName(input.participantName).map(escapeSvg);
  const has2Lines = participantLines.length > 1;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
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
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" rx="24"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent)"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#accent)"/>

  <rect x="40" y="40" width="580" height="1120" fill="#1e293b" rx="16" stroke="#334155" stroke-width="1"/>

  <text x="330" y="200" text-anchor="middle" fill="#10b981" font-size="18" font-weight="600" font-family="sans-serif" letter-spacing="4">CERTIFICATE</text>

  <text x="330" y="380" text-anchor="middle" fill="#94a3b8" font-size="24" font-weight="600" font-family="sans-serif" letter-spacing="2">NOMOR SERTIFIKAT</text>
  <text x="330" y="420" text-anchor="middle" fill="#f1f5f9" font-size="29" font-weight="700" font-family="monospace">${escapeSvg(input.certificateNumber)}</text>

  <line x1="140" y1="460" x2="520" y2="460" stroke="#334155" stroke-width="1"/>

  <text x="330" y="510" text-anchor="middle" fill="#94a3b8" font-size="24" font-weight="600" font-family="sans-serif" letter-spacing="2">TANGGAL TERBIT</text>
  <text x="330" y="550" text-anchor="middle" fill="#f1f5f9" font-size="24" font-weight="700" font-family="sans-serif">${escapeSvg(formatIssuedDate(input.issuedAt))}</text>

  <line x1="140" y1="590" x2="520" y2="590" stroke="#334155" stroke-width="1"/>

  <text x="330" y="640" text-anchor="middle" fill="#94a3b8" font-size="24" font-weight="600" font-family="sans-serif" letter-spacing="2">WALLET PESERTA</text>
  <text x="330" y="680" text-anchor="middle" fill="#f1f5f9" font-size="24" font-weight="700" font-family="monospace">${escapeSvg(shortenWallet(input.walletAddress))}</text>

  <line x1="140" y1="720" x2="520" y2="720" stroke="#334155" stroke-width="1"/>

  <text x="330" y="770" text-anchor="middle" fill="#94a3b8" font-size="24" font-weight="600" font-family="sans-serif" letter-spacing="2">JENIS TOKEN</text>
  <text x="330" y="810" text-anchor="middle" fill="#fbbf24" font-size="24" font-weight="700" font-family="sans-serif">Soulbound Token (SBT)</text>

  <line x1="660" y1="80" x2="660" y2="1120" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>

  <text x="1130" y="180" text-anchor="middle" fill="#94a3b8" font-size="22" font-family="sans-serif" letter-spacing="5">DIBERIKAN KEPADA</text>

  <text x="1130" y="${has2Lines ? 270 : 300}" text-anchor="middle" fill="#f1f5f9" font-size="77" font-weight="700" font-family="sans-serif">${participantLines[0] ?? "Peserta"}</text>
  ${has2Lines ? `<text x="1130" y="350" text-anchor="middle" fill="#f1f5f9" font-size="77" font-weight="700" font-family="sans-serif">${participantLines[1]}</text>` : ""}

  <rect x="880" y="${has2Lines ? 390 : 340}" width="500" height="4" fill="url(#accent)" rx="2"/>

  <text x="1130" y="${has2Lines ? 460 : 410}" text-anchor="middle" fill="#94a3b8" font-size="22" font-family="sans-serif" letter-spacing="3">ATAS PENYELESAIAN PELATIHAN</text>

  <text x="1130" y="${has2Lines ? 530 : 480}" text-anchor="middle" fill="#10b981" font-size="36" font-weight="700" font-family="sans-serif">${escapeSvg(input.trainingName)}</text>

  <text x="1130" y="${has2Lines ? 580 : 530}" text-anchor="middle" fill="#64748b" font-size="24" font-family="sans-serif">Bidang: ${escapeSvg(input.trainingField)}</text>

  <text x="1130" y="1020" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="sans-serif" letter-spacing="2">DITERBITKAN OLEH</text>
  <text x="1130" y="1060" text-anchor="middle" fill="#f1f5f9" font-size="22" font-weight="700" font-family="sans-serif">Sistem Sertifikat Digital Pelatihan</text>
  <text x="1130" y="1090" text-anchor="middle" fill="#64748b" font-size="16" font-family="sans-serif">Terverifikasi secara on-chain di Polygon Amoy Testnet</text>
</svg>`;
}
