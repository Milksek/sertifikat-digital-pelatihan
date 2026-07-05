import path from "node:path";
import { readFileSync } from "node:fs";
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

export async function renderCertificatePng(input: RenderCertificateInput) {
  const candidates = [
    path.join(process.cwd(), "public", "certificate_template.png"),
    path.join(process.cwd(), "certificate_template.png"),
    path.join(process.cwd(), ".next", "server", "app", "certificate_template.png"),
  ];
  let templateBuffer: Buffer | null = null;
  for (const p of candidates) {
    try {
      templateBuffer = readFileSync(p);
      break;
    } catch {}
  }
  if (!templateBuffer) throw new Error("Template sertifikat tidak ditemukan di server.");
  const template = sharp(templateBuffer);
  const metadata = await template.metadata();

  const width = metadata.width ?? 1600;
  const height = metadata.height ?? 1200;
  const participantLines = splitName(input.participantName);
  const safeParticipantLines = participantLines.map(escapeSvgText);

  const overlay = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { fill: #ffffff; font-size: ${Math.round(width * 0.03)}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
        .name { fill: #ffffff; font-size: ${Math.round(width * 0.048)}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
        .label { fill: #ffffff; font-size: ${Math.round(width * 0.015)}px; font-weight: 600; font-family: 'Poppins', sans-serif; letter-spacing: 1.2px; }
        .value { fill: #ffffff; font-size: ${Math.round(width * 0.018)}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
        .field { fill: #ffffff; font-size: ${Math.round(width * 0.015)}px; font-weight: 400; font-family: 'Poppins', sans-serif; }
      </style>
 
      <!-- Nama Peserta (Sejajar di tengah area abu-abu kanan pada 68%) -->
      <text x="64%" y="52%" text-anchor="middle" class="name">${safeParticipantLines[0] ?? "Peserta"}</text>
      ${safeParticipantLines[1] ? `<text x="68%" y="58.8%" text-anchor="middle" class="name">${safeParticipantLines[1]}</text>` : ""}
 
      <!-- Nama Pelatihan & Bidang (Di atas dan di bawah garis putih kedua) -->
      <text x="54%" y="73%" text-anchor="middle" class="value">${escapeSvgText(input.trainingName)}</text>
      <text x="68%" y="68%" text-anchor="middle" class="field">${escapeSvgText(input.trainingField)}</text>

      <!-- Nomor Sertifikat (Pojok Kiri Atas) -->
      <text x="5%" y="5%" class="label">NOMOR SERTIFIKAT</text>
      <text x="5%" y="8%" class="value">${escapeSvgText(input.certificateNumber)}</text>

      <!-- Informasi Bawah (Kiri, Tengah area abu-abu) -->
      <text x="45%" y="78%" class="label">TANGGAL TERBIT</text>
      <text x="45%" y="81%" class="value">${escapeSvgText(formatIssuedDate(input.issuedAt))}</text>

      <text x="65%" y="78%" class="label">WALLET PESERTA</text>
      <text x="65%" y="81%" class="value">${escapeSvgText(shortenWallet(input.walletAddress))}</text>
    </svg>
  `;

  return template
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
