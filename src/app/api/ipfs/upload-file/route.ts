import { NextRequest, NextResponse } from "next/server";

const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || "";

export async function POST(req: NextRequest) {
  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return NextResponse.json(
        { error: "Konfigurasi IPFS tidak ditemukan" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 },
      );
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: pinataForm,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Pinata upload gagal: ${text}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json({ ipfsUri: `ipfs://${data.IpfsHash}` });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Upload file gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

