import path from "node:path";
import sharp from "sharp";
import { GlobalFonts } from "@napi-rs/canvas";

const fontPath = path.join(process.cwd(), "public", "fonts", "Inter-Variable.ttf");
if (!GlobalFonts.families.includes("Inter")) {
  GlobalFonts.registerFromPath(fontPath, "Inter");
}

type RenderCertificateInput = {
  participantName: string;
  certificateNumber: string;
  trainingName: string;
  trainingField: string;
  issuedAt: string;
  walletAddress: string;
  verifyUrl?: string;
};

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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderTextCanvas(
  input: RenderCertificateInput,
  width: number,
  height: number,
): Promise<Buffer> {
  // @napi-rs/canvas is a hard dependency — imported at call site to avoid
  // top-level require failures on environments where it's not needed.
  const { createCanvas } = await import("@napi-rs/canvas");

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ponytail: position percentages tuned to the existing Canva template.
  // Upgrade path: read coordinates from template metadata or design file.
  const pW = (pct: number) => Math.round(width * pct);
  const pH = (pct: number) => Math.round(height * pct);
  const px = (pct: number) => Math.round(width * pct);

  const participantLines = splitName(input.participantName);

  // --- NOMOR SERTIFIKAT (top-left) ---
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.font = `600 ${px(0.018)}px Inter`;
  ctx.fillText("NOMOR SERTIFIKAT", pW(0.05), pH(0.035));

  ctx.font = `700 ${px(0.025)}px Inter`;
  ctx.fillText(input.certificateNumber, pW(0.05), pH(0.07));

  // --- PARTICIPANT NAME (center, large) ---
  ctx.font = `700 ${px(0.048)}px Inter`;
  ctx.textAlign = "center";
  if (participantLines[0]) ctx.fillText(participantLines[0], pW(0.50), pH(0.52));
  if (participantLines[1]) ctx.fillText(participantLines[1], pW(0.50), pH(0.59));
  ctx.textAlign = "left";

  // --- TRAINING NAME ---
  ctx.font = `600 ${px(0.025)}px Inter`;
  ctx.fillText(input.trainingName, pW(0.45), pH(0.73));

  // --- TRAINING FIELD (centered at right) ---
  ctx.font = `600 ${px(0.02)}px Inter`;
  ctx.textAlign = "center";
  ctx.fillText(input.trainingField, pW(0.70), pH(0.68));
  ctx.textAlign = "left";

  // --- TANGGAL TERBIT ---
  ctx.font = `600 ${px(0.018)}px Inter`;
  ctx.fillText("TANGGAL TERBIT", pW(0.45), pH(0.78));

  ctx.font = `700 ${px(0.025)}px Inter`;
  ctx.fillText(formatIssuedDate(input.issuedAt), pW(0.45), pH(0.81));

  // --- WALLET PESERTA ---
  ctx.font = `600 ${px(0.018)}px Inter`;
  ctx.fillText("WALLET PESERTA", pW(0.65), pH(0.78));

  ctx.font = `700 ${px(0.025)}px Inter`;
  ctx.fillText(shortenWallet(input.walletAddress), pW(0.65), pH(0.81));

  return canvas.toBuffer("image/png");
}

export async function renderCertificatePng(input: RenderCertificateInput) {
  const templatePath = path.join(process.cwd(), "public", "certificate-template.png");
  const templateMeta = await sharp(templatePath).metadata();
  const width = templateMeta.width ?? 2000;
  const height = templateMeta.height ?? 2000;

  // Primary: @napi-rs/canvas — Skia-based, bundles own fonts, works on Vercel Linux
  const textBuffer = await renderTextCanvas(input, width, height);

  const result = await sharp(templatePath)
    .composite([{ input: textBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Pixel validation: sample name area to verify text was rendered
  const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
  const sampleIdx = (Math.round(height * 0.52) * info.width + Math.round(width * 0.50)) * info.channels;
  const namePixel = { r: data[sampleIdx], g: data[sampleIdx + 1], b: data[sampleIdx + 2] };
  const isGrayBg = namePixel.r > 140 && namePixel.r < 190 &&
    Math.abs(namePixel.r - namePixel.g) < 15 &&
    Math.abs(namePixel.g - namePixel.b) < 15;

  if (isGrayBg) {
    console.warn("[renderer] Warning: name area pixel looks like blank template bg", namePixel);
  }

  return result;
}
