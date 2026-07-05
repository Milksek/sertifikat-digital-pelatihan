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

export async function renderCertificatePng(input: RenderCertificateInput) {
  const W = 1600, H = 1200;
  const participantLines = splitName(input.participantName).map(escapeSvg);

  // Create background: solid dark color (avoids needing PNG file)
  const background = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  }).png().toBuffer();

  // SVG text overlay
  const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .name { fill: #ffffff; font-size: 77px; font-weight: 700; font-family: sans-serif; }
      .label { fill: #94a3b8; font-size: 24px; font-weight: 600; font-family: sans-serif; letter-spacing: 2px; }
      .value { fill: #f1f5f9; font-size: 29px; font-weight: 700; font-family: monospace; }
      .field { fill: #64748b; font-size: 24px; font-weight: 400; font-family: sans-serif; }
      .section { fill: #10b981; font-size: 36px; font-weight: 700; font-family: sans-serif; }
    </style>

    <!-- Left panel background -->
    <rect x="40" y="40" width="580" height="1120" fill="#1e293b" rx="16" stroke="#334155" stroke-width="1"/>

    <!-- Certificate icon text -->
    <text x="330" y="200" text-anchor="middle" fill="#10b981" font-size="60" font-family="serif">&#127891;</text>
    <text x="330" y="250" text-anchor="middle" fill="#10b981" font-size="18" font-weight="600" font-family="sans-serif" letter-spacing="4">CERTIFICATE</text>

    <!-- Nomor Sertifikat -->
    <text x="330" y="380" text-anchor="middle" class="label">NOMOR SERTIFIKAT</text>
    <text x="330" y="420" text-anchor="middle" class="value">${escapeSvg(input.certificateNumber)}</text>

    <line x1="140" y1="460" x2="520" y2="460" stroke="#334155" stroke-width="1"/>

    <!-- Tanggal Terbit -->
    <text x="330" y="510" text-anchor="middle" class="label">TANGGAL TERBIT</text>
    <text x="330" y="550" text-anchor="middle" fill="#f1f5f9" font-size="24" font-weight="700" font-family="sans-serif">${escapeSvg(formatIssuedDate(input.issuedAt))}</text>

    <line x1="140" y1="590" x2="520" y2="590" stroke="#334155" stroke-width="1"/>

    <!-- Wallet -->
    <text x="330" y="640" text-anchor="middle" class="label">WALLET PESERTA</text>
    <text x="330" y="680" text-anchor="middle" class="value">${escapeSvg(shortenWallet(input.walletAddress))}</text>

    <line x1="140" y1="720" x2="520" y2="720" stroke="#334155" stroke-width="1"/>

    <!-- Token Type -->
    <text x="330" y="770" text-anchor="middle" class="label">JENIS TOKEN</text>
    <text x="330" y="810" text-anchor="middle" fill="#fbbf24" font-size="24" font-weight="700" font-family="sans-serif">Soulbound Token (SBT)</text>

    <!-- Vertical divider -->
    <line x1="660" y1="80" x2="660" y2="1120" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>

    <!-- Right panel - Title -->
    <text x="1130" y="180" text-anchor="middle" fill="#94a3b8" font-size="22" font-family="sans-serif" letter-spacing="5">DIBERIKAN KEPADA</text>

    <!-- Participant Name -->
    <text x="1130" y="290" text-anchor="middle" class="name">${participantLines[0] ?? "Peserta"}</text>
    ${participantLines[1] ? `<text x="1130" y="360" text-anchor="middle" class="name">${participantLines[1]}</text>` : ""}

    <!-- Accent line -->
    <rect x="880" y="${participantLines[1] ? 400 : 320}" width="500" height="4" fill="#10b981" rx="2"/>

    <!-- Training info -->
    <text x="1130" y="${participantLines[1] ? 470 : 400}" text-anchor="middle" fill="#94a3b8" font-size="22" font-family="sans-serif" letter-spacing="3">ATAS PENYELESAIAN PELATIHAN</text>
    <text x="1130" y="${participantLines[1] ? 540 : 470}" text-anchor="middle" class="section">${escapeSvg(input.trainingName)}</text>
    <text x="1130" y="${participantLines[1] ? 590 : 520}" text-anchor="middle" class="field">Bidang: ${escapeSvg(input.trainingField)}</text>

    <!-- Publisher -->
    <text x="1130" y="1020" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="sans-serif" letter-spacing="2">DITERBITKAN OLEH</text>
    <text x="1130" y="1060" text-anchor="middle" fill="#f1f5f9" font-size="22" font-weight="700" font-family="sans-serif">Sistem Sertifikat Digital Pelatihan</text>
    <text x="1130" y="1090" text-anchor="middle" fill="#64748b" font-size="16" font-family="sans-serif">Terverifikasi secara on-chain di Polygon Amoy Testnet</text>

    <!-- Top accent line -->
    <rect x="0" y="0" width="${W}" height="6" fill="#10b981" rx="0"/>
    <!-- Bottom accent line -->
    <rect x="0" y="${H - 6}" width="${W}" height="6" fill="#10b981" rx="0"/>
  </svg>`;

  // Composite SVG text over solid background
  return sharp(background)
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
