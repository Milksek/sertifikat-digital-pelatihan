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

// Pure SVG — works on Vercel serverless, zero file dependencies
export function renderCertificateSvg(input: RenderCertificateInput): string {
  const W = 1600, H = 1200;
  const participantLines = splitName(input.participantName).map(escapeSvg);
  const has2 = participantLines.length > 1;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="50%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <clipPath id="rounded"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  </defs>

  <!-- Background -->
  <g clip-path="url(#rounded)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <!-- Subtle grid pattern -->
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1f2937" stroke-width="0.5"/>
    </pattern>
    <rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.3"/>
  </g>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="${W}" height="5" fill="url(#accent)"/>
  <!-- Bottom accent bar -->
  <rect x="0" y="${H - 5}" width="${W}" height="5" fill="url(#accent)"/>

  <!-- LEFT PANEL -->
  <rect x="32" y="32" width="600" height="${H - 64}" fill="#1f2937" rx="12" stroke="#374151" stroke-width="1"/>

  <!-- Emboss seal circle -->
  <circle cx="332" cy="220" r="70" fill="none" stroke="#10b981" stroke-width="2" opacity="0.4"/>
  <circle cx="332" cy="220" r="55" fill="none" stroke="#10b981" stroke-width="1" opacity="0.2"/>
  <text x="332" y="210" text-anchor="middle" fill="#10b981" font-size="14" font-weight="700" font-family="serif" letter-spacing="3">CERTIFICATE</text>
  <text x="332" y="235" text-anchor="middle" fill="#10b981" font-size="11" font-weight="400" font-family="serif" letter-spacing="5">OF COMPLETION</text>

  <!-- Divider -->
  <line x1="80" y1="320" x2="584" y2="320" stroke="#374151" stroke-width="1"/>

  <!-- Nomor Sertifikat -->
  <text x="332" y="370" text-anchor="middle" fill="#9ca3af" font-size="11" font-weight="600" font-family="sans-serif" letter-spacing="3">NOMOR SERTIFIKAT</text>
  <text x="332" y="400" text-anchor="middle" fill="#f9fafb" font-size="16" font-weight="700" font-family="monospace">${escapeSvg(input.certificateNumber)}</text>

  <line x1="80" y1="430" x2="584" y2="430" stroke="#374151" stroke-width="1"/>

  <!-- Tanggal Terbit -->
  <text x="332" y="470" text-anchor="middle" fill="#9ca3af" font-size="11" font-weight="600" font-family="sans-serif" letter-spacing="3">TANGGAL TERBIT</text>
  <text x="332" y="500" text-anchor="middle" fill="#f9fafb" font-size="15" font-weight="700" font-family="sans-serif">${escapeSvg(formatIssuedDate(input.issuedAt))}</text>

  <line x1="80" y1="530" x2="584" y2="530" stroke="#374151" stroke-width="1"/>

  <!-- Wallet -->
  <text x="332" y="570" text-anchor="middle" fill="#9ca3af" font-size="11" font-weight="600" font-family="sans-serif" letter-spacing="3">WALLET PESERTA</text>
  <text x="332" y="600" text-anchor="middle" fill="#f9fafb" font-size="14" font-weight="700" font-family="monospace">${escapeSvg(shortenWallet(input.walletAddress))}</text>

  <line x1="80" y1="630" x2="584" y2="630" stroke="#374151" stroke-width="1"/>

  <!-- Token Type -->
  <text x="332" y="670" text-anchor="middle" fill="#9ca3af" font-size="11" font-weight="600" font-family="sans-serif" letter-spacing="3">JENIS TOKEN</text>
  <text x="332" y="700" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="700" font-family="sans-serif">Soulbound Token (SBT)</text>

  <line x1="80" y1="730" x2="584" y2="730" stroke="#374151" stroke-width="1"/>

  <!-- Penerbit -->
  <text x="332" y="770" text-anchor="middle" fill="#9ca3af" font-size="11" font-weight="600" font-family="sans-serif" letter-spacing="3">PENERBIT</text>
  <text x="332" y="800" text-anchor="middle" fill="#f9fafb" font-size="14" font-weight="700" font-family="sans-serif">Sistem Sertifikat Digital</text>
  <text x="332" y="822" text-anchor="middle" fill="#6b7280" font-size="12" font-weight="400" font-family="sans-serif">Pelatihan</text>

  <!-- VERTICAL DIVIDER -->
  <line x1="660" y1="50" x2="660" y2="${H - 50}" stroke="#374151" stroke-width="1" stroke-dasharray="6,4"/>

  <!-- RIGHT PANEL -->
  <!-- Subtitle -->
  <text x="1130" y="200" text-anchor="middle" fill="#6b7280" font-size="15" font-family="sans-serif" letter-spacing="6" font-weight="400">DIBERIKAN KEPADA</text>

  <!-- Participant name -->
  <text x="1130" y="${has2 ? 300 : 330}" text-anchor="middle" fill="#f9fafb" font-size="68" font-weight="800" font-family="sans-serif">${participantLines[0] ?? "Peserta"}</text>
  ${has2 ? `<text x="1130" y="380" text-anchor="middle" fill="#f9fafb" font-size="68" font-weight="800" font-family="sans-serif">${participantLines[1]}</text>` : ""}

  <!-- Accent underline -->
  <rect x="${1130 - 220}" y="${has2 ? 410 : 355}" width="440" height="3" fill="url(#accent)" rx="2"/>

  <!-- Subtitle below name -->
  <text x="1130" y="${has2 ? 470 : 415}" text-anchor="middle" fill="#6b7280" font-size="16" font-family="sans-serif" letter-spacing="3">ATAS PENYELESAIAN PELATIHAN</text>

  <!-- Training name -->
  <text x="1130" y="${has2 ? 540 : 485}" text-anchor="middle" fill="#10b981" font-size="34" font-weight="700" font-family="sans-serif">${escapeSvg(input.trainingName)}</text>

  <!-- Training field -->
  <text x="1130" y="${has2 ? 590 : 535}" text-anchor="middle" fill="#6b7280" font-size="18" font-family="sans-serif">Bidang: ${escapeSvg(input.trainingField)}</text>

  <!-- Bottom publisher section -->
  <text x="1130" y="${H - 160}" text-anchor="middle" fill="#6b7280" font-size="12" font-family="sans-serif" letter-spacing="3">DITERBITKAN OLEH</text>
  <text x="1130" y="${H - 125}" text-anchor="middle" fill="#f9fafb" font-size="18" font-weight="700" font-family="sans-serif">Sistem Sertifikat Digital Pelatihan</text>
  <text x="1130" y="${H - 95}" text-anchor="middle" fill="#4b5563" font-size="13" font-family="sans-serif">Terverifikasi secara on-chain di Polygon Amoy Testnet</text>
</svg>`;
}

// sharp-based PNG renderer — composites text onto Canva template
// ponytail: needs sharp + public/certificate_template.png, add when Vercel serverless
export async function renderCertificatePng(input: RenderCertificateInput): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const path = (await import("path"));
  const fs = (await import("fs"));

  const candidates = [
    path.join(process.cwd(), "public", "certificate_template.png"),
    path.join(process.cwd(), "src", "app", "api", "admin", "preview-certificate", "certificate_template.png"),
    path.join(process.cwd(), "src", "app", "api", "admin", "mint", "certificate_template.png"),
  ];

  let templateBuffer: Buffer | null = null;
  for (const p of candidates) {
    try { templateBuffer = fs.readFileSync(p); break; } catch {}
  }
  if (!templateBuffer) throw new Error("Template sertifikat tidak ditemukan di server.");

  const template = sharp(templateBuffer);
  const metadata = await template.metadata();
  const width = metadata.width ?? 2000;
  const height = metadata.height ?? 2000;

  const participantLines = splitName(input.participantName);
  const safeLines = participantLines.map(escapeSvg);

  const overlay = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .name { fill: #ffffff; font-size: ${Math.round(width * 0.048)}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
        .label { fill: #ffffff; font-size: ${Math.round(width * 0.015)}px; font-weight: 600; font-family: 'Poppins', sans-serif; letter-spacing: 1.2px; }
        .value { fill: #ffffff; font-size: ${Math.round(width * 0.018)}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
        .field { fill: #ffffff; font-size: ${Math.round(width * 0.015)}px; font-weight: 400; font-family: 'Poppins', sans-serif; }
      </style>

      <text x="64%" y="52%" text-anchor="middle" class="name">${safeLines[0] ?? "Peserta"}</text>
      ${safeLines[1] ? `<text x="68%" y="58.8%" text-anchor="middle" class="name">${safeLines[1]}</text>` : ""}

      <text x="54%" y="73%" text-anchor="middle" class="value">${escapeSvg(input.trainingName)}</text>
      <text x="68%" y="68%" text-anchor="middle" class="field">${escapeSvg(input.trainingField)}</text>

      <text x="5%" y="5%" class="label">NOMOR SERTIFIKAT</text>
      <text x="5%" y="8%" class="value">${escapeSvg(input.certificateNumber)}</text>

      <text x="45%" y="78%" class="label">TANGGAL TERBIT</text>
      <text x="45%" y="81%" class="value">${escapeSvg(formatIssuedDate(input.issuedAt))}</text>

      <text x="65%" y="78%" class="label">WALLET PESERTA</text>
      <text x="65%" y="81%" class="value">${escapeSvg(shortenWallet(input.walletAddress))}</text>
    </svg>
  `;

  return template
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
