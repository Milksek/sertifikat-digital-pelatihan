import path from "node:path";
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

function buildSvgText(input: RenderCertificateInput, width: number, height: number) {
  const participantLines = splitName(input.participantName).map(escapeSvgText);
  const pW = (pct: number) => Math.round(width * pct);
  const pH = (pct: number) => Math.round(height * pct);
  const labelStyle = `fill:#ffffff;font-size:${Math.round(width * 0.018)}px;font-weight:600;font-family:Arial,Helvetica,sans-serif;letter-spacing:2px;`;
  const valueStyle = `fill:#ffffff;font-size:${Math.round(width * 0.025)}px;font-weight:700;font-family:Arial,Helvetica,sans-serif;`;
  const nameStyle = `fill:#ffffff;font-size:${Math.round(width * 0.048)}px;font-weight:700;font-family:Arial,Helvetica,sans-serif;`;
  const trainingStyle = `fill:#ffffff;font-size:${Math.round(width * 0.025)}px;font-weight:600;font-family:Arial,Helvetica,sans-serif;`;
  const fieldStyle = `fill:#ffffff;font-size:${Math.round(width * 0.02)}px;font-weight:600;font-family:Arial,Helvetica,sans-serif;`;

  return `
    <text x="${pW(0.05)}" y="${pH(0.035)}" style="${labelStyle}">NOMOR SERTIFIKAT</text>
    <text x="${pW(0.05)}" y="${pH(0.07)}" style="${valueStyle}">${escapeSvgText(input.certificateNumber)}</text>
    <text x="${pW(0.45)}" y="${pH(0.52)}" style="${nameStyle}">${participantLines[0] ?? "Peserta"}</text>
    ${participantLines[1] ? `<text x="${pW(0.45)}" y="${pH(0.59)}" style="${nameStyle}">${participantLines[1]}</text>` : ""}
    <text x="${pW(0.45)}" y="${pH(0.73)}" style="${trainingStyle}">${escapeSvgText(input.trainingName)}</text>
    <text x="${pW(0.70)}" y="${pH(0.68)}" style="${fieldStyle}" text-anchor="middle">${escapeSvgText(input.trainingField)}</text>
    <text x="${pW(0.45)}" y="${pH(0.78)}" style="${labelStyle}">TANGGAL TERBIT</text>
    <text x="${pW(0.45)}" y="${pH(0.81)}" style="${valueStyle}">${escapeSvgText(formatIssuedDate(input.issuedAt))}</text>
    <text x="${pW(0.65)}" y="${pH(0.78)}" style="${labelStyle}">WALLET PESERTA</text>
    <text x="${pW(0.65)}" y="${pH(0.81)}" style="${valueStyle}">${escapeSvgText(shortenWallet(input.walletAddress))}</text>
  `;
}

export async function renderCertificatePng(input: RenderCertificateInput) {
  const templatePath = path.join(process.cwd(), "public", "certificate-template.png");
  const template = sharp(templatePath);
  const metadata = await template.metadata();

  const width = metadata.width ?? 2000;
  const height = metadata.height ?? 2000;
  const overlay = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${buildSvgText(input, width, height)}
    </svg>
  `;

  return template
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
