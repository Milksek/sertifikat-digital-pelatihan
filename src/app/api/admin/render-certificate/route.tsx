import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { CertificateRenderTemplate, type CertificateRenderData } from "@/lib/certificate-render-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let regularFont: Buffer | null = null;
let boldFont: Buffer | null = null;

function loadFont(name: string) {
  const filePath = join(process.cwd(), "src", "fonts", name);
  return readFileSync(filePath);
}

function getData(url: URL): CertificateRenderData {
  return {
    participantName: url.searchParams.get("participantName") || "Peserta",
    certificateNumber: url.searchParams.get("certificateNumber") || "SSDP-JWD-UNKNOWN",
    trainingName: url.searchParams.get("trainingName") || "Junior Web Developer",
    trainingField: url.searchParams.get("trainingField") || "Pengembangan Web",
    issuedAt: url.searchParams.get("issuedAt") || new Date().toISOString(),
    walletAddress: url.searchParams.get("walletAddress") || "0x0000000000000000000000000000000000000000",
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = getData(url);

  regularFont ||= loadFont("Poppins-Regular.ttf");
  boldFont ||= loadFont("Poppins-Bold.ttf");

  return new ImageResponse(
    <CertificateRenderTemplate data={data} size={1200} />,
    {
      width: 1200,
      height: 1200,
      fonts: [
        { name: "Poppins", data: regularFont, style: "normal", weight: 400 },
        { name: "Poppins", data: boldFont, style: "normal", weight: 700 },
      ],
    },
  );
}
