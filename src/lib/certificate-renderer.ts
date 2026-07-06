import path from "node:path";
import fs from "node:fs";
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

function escapeSvgText(value: string) {
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

let cachedFontBase64: string | null = null;

function getFontBase64(): string {
  if (cachedFontBase64) return cachedFontBase64;
  const fontPath = path.join(process.cwd(), "public", "fonts", "Inter-Variable.ttf");
  const buf = fs.readFileSync(fontPath);
  cachedFontBase64 = buf.toString("base64");
  return cachedFontBase64;
}

export async function renderCertificatePng(input: RenderCertificateInput) {
  const templatePath = path.join(process.cwd(), "public", "certificate-template.png");
  const template = sharp(templatePath);
  const metadata = await template.metadata();

  const width = metadata.width ?? 2000;
  const height = metadata.height ?? 2000;
  const participantLines = splitName(input.participantName);
  const safeParticipantLines = participantLines.map(escapeSvgText);
  const fontB64 = getFontBase64();

  const overlay = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          @font-face {
            font-family: 'Inter';
            src: url(data:font/truetype;base64,${fontB64}) format('truetype');
            font-weight: 100 900;
          }
          .label { fill: #ffffff; font-size: ${Math.round(width * 0.018)}px; font-weight: 600; font-family: 'Inter', sans-serif; letter-spacing: 2px; }
          .value { fill: #ffffff; font-size: ${Math.round(width * 0.025)}px; font-weight: 700; font-family: 'Inter', sans-serif; }
          .name { fill: #ffffff; font-size: ${Math.round(width * 0.048)}px; font-weight: 700; font-family: 'Inter', sans-serif; }
          .training { fill: #ffffff; font-size: ${Math.round(width * 0.025)}px; font-weight: 600; font-family: 'Inter', sans-serif; }
          .field { fill: #ffffff; font-size: ${Math.round(width * 0.020)}px; font-weight: 600; font-family: 'Inter', sans-serif; }
        </style>
      </defs>

      <!-- Nomor Sertifikat -->
      <text x="${Math.round(width * 0.05)}" y="${Math.round(height * 0.035)}" class="label">NOMOR SERTIFIKAT</text>
      <text x="${Math.round(width * 0.05)}" y="${Math.round(height * 0.07)}" class="value">${escapeSvgText(input.certificateNumber)}</text>

      <!-- Nama Peserta -->
      <text x="${Math.round(width * 0.45)}" y="${Math.round(height * 0.52)}" class="name">${safeParticipantLines[0] ?? "Peserta"}</text>
      ${safeParticipantLines[1] ? `<text x="${Math.round(width * 0.45)}" y="${Math.round(height * 0.59)}" class="name">${safeParticipantLines[1]}</text>` : ""}

      <!-- Nama Pelatihan & Bidang -->
      <text x="${Math.round(width * 0.45)}" y="${Math.round(height * 0.73)}" class="training">${escapeSvgText(input.trainingName)}</text>
      <text x="${Math.round(width * 0.70)}" y="${Math.round(height * 0.68)}" class="field" text-anchor="middle">${escapeSvgText(input.trainingField)}</text>

      <!-- Tanggal Terbit -->
      <text x="${Math.round(width * 0.45)}" y="${Math.round(height * 0.78)}" class="label">TANGGAL TERBIT</text>
      <text x="${Math.round(width * 0.45)}" y="${Math.round(height * 0.81)}" class="value">${escapeSvgText(formatIssuedDate(input.issuedAt))}</text>

      <!-- Wallet Peserta -->
      <text x="${Math.round(width * 0.65)}" y="${Math.round(height * 0.78)}" class="label">WALLET PESERTA</text>
      <text x="${Math.round(width * 0.65)}" y="${Math.round(height * 0.81)}" class="value">${escapeSvgText(shortenWallet(input.walletAddress))}</text>
    </svg>
  `;

  return template
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
