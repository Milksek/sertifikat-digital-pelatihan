import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

type RenderInput = {
  participantName: string;
  certificateNumber: string;
  trainingName: string;
  trainingField: string;
  issuedAt: string;
  walletAddress: string;
};

function escapeSvg(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function formatIssuedDate(v: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(v));
}

function shortenWallet(v: string) {
  return v.length <= 15 ? v : `${v.slice(0, 6)}...${v.slice(-4)}`;
}

function splitName(v: string, max = 28) {
  const words = v.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["Peserta"];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= max || !cur) { cur = next; continue; }
    lines.push(cur);
    cur = w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function loadFont(name: string): string | null {
  const candidates = [
    join(process.cwd(), "src", "fonts", name),
    join(process.cwd(), "public", "fonts", name),
  ];
  for (const p of candidates) {
    try {
      const buf = readFileSync(p);
      return `data:font/woff2;base64,${buf.toString("base64")}`;
    } catch {}
  }
  return null;
}

function findTemplate(): Buffer {
  const candidates = [
    join(process.cwd(), "public", "certificate_template.png"),
    join(process.cwd(), "src", "app", "api", "admin", "preview-certificate", "certificate_template.png"),
    join(process.cwd(), "src", "app", "api", "admin", "mint", "certificate_template.png"),
  ];
  for (const p of candidates) {
    try { return readFileSync(p); } catch {}
  }
  throw new Error("Template sertifikat tidak ditemukan di server.");
}

export async function renderCertificatePng(input: RenderInput): Promise<Buffer> {
  const templateBuffer = findTemplate();
  const meta = await sharp(templateBuffer).metadata();
  const W = meta.width ?? 2000;
  const H = meta.height ?? 2000;
  const scale = W / 2000;

  const regularFont = loadFont("Poppins-Regular.woff2");
  const boldFont = loadFont("Poppins-Bold.woff2");
  const semiBoldFont = loadFont("Poppins-SemiBold.woff2");

  const nameLines = splitName(input.participantName).map(escapeSvg);

  let fontFaces = "";
  if (regularFont) fontFaces += `@font-face { font-family: 'Poppins'; src: url('${regularFont}'); font-weight: 400; }`;
  if (semiBoldFont) fontFaces += `@font-face { font-family: 'Poppins'; src: url('${semiBoldFont}'); font-weight: 600; }`;
  if (boldFont) fontFaces += `@font-face { font-family: 'Poppins'; src: url('${boldFont}'); font-weight: 700; }`;

  const nameSize = Math.round(96 * scale);
  const labelSize = Math.round(30 * scale);
  const valueSize = Math.round(36 * scale);
  const fieldSize = Math.round(30 * scale);

  const overlay = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${fontFaces}
    .name { fill: #ffffff; font-size: ${nameSize}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
    .label { fill: #ffffff; font-size: ${labelSize}px; font-weight: 600; font-family: 'Poppins', sans-serif; letter-spacing: 1.2px; }
    .value { fill: #ffffff; font-size: ${valueSize}px; font-weight: 700; font-family: 'Poppins', sans-serif; }
    .field { fill: #ffffff; font-size: ${fieldSize}px; font-weight: 400; font-family: 'Poppins', sans-serif; }
  </style>

  <text x="64%" y="52%" text-anchor="middle" class="name">${nameLines[0] ?? "Peserta"}</text>
  ${nameLines[1] ? `<text x="68%" y="58.8%" text-anchor="middle" class="name">${nameLines[1]}</text>` : ""}

  <text x="54%" y="73%" text-anchor="middle" class="value">${escapeSvg(input.trainingName)}</text>
  <text x="68%" y="68%" text-anchor="middle" class="field">${escapeSvg(input.trainingField)}</text>

  <text x="5%" y="5%" class="label">NOMOR SERTIFIKAT</text>
  <text x="5%" y="8%" class="value">${escapeSvg(input.certificateNumber)}</text>

  <text x="45%" y="78%" class="label">TANGGAL TERBIT</text>
  <text x="45%" y="81%" class="value">${escapeSvg(formatIssuedDate(input.issuedAt))}</text>

  <text x="65%" y="78%" class="label">WALLET PESERTA</text>
  <text x="65%" y="81%" class="value">${escapeSvg(shortenWallet(input.walletAddress))}</text>
</svg>`;

  return sharp(templateBuffer)
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
