import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatEther,
  http,
  parseAbi,
  parseAbiItem,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import {
  CERTIFICATE_ISSUER,
  CERTIFICATE_TITLE,
  TRAINING_FIELD,
  TRAINING_NAME,
} from "@/lib/app-config";
import { renderCertificatePng } from "@/lib/certificate-renderer";
import { buildCertificateNumber } from "@/lib/certificate-number";


export const runtime = "nodejs";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS || "").trim() as `0x${string}` | undefined;
const RPC_URL = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
const PINATA_JWT = process.env.PINATA_JWT;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | string | undefined;

const MINT_ABI = parseAbi([
  "function mintCertificate(address recipient, string tokenUri)",
]);

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

type Profile = {
  id: string;
  role: string;
  wallet_address: string;
  full_name: string | null;
  email?: string | null;
};

type Assessment = {
  id: string;
  status: string;
  participant_id: string;
  recommendation: string | null;
  participant: {
    id: string;
    wallet_address: string;
    full_name: string | null;
    email: string | null;
    nik: string | null;
  } | null;
};

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment belum lengkap.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function getAuthedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase auth environment belum lengkap.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizePrivateKey(value: string) {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

function toIpfsGateway(uri: string | null) {
  if (!uri) return null;
  return uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;
}

async function uploadJsonToPinata(fileName: string, payload: object) {
  if (!PINATA_JWT) throw new Error("PINATA_JWT belum diisi.");

  const formData = new FormData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const file = new File([blob], fileName, { type: "application/json" });
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: fileName }));
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result?.IpfsHash) {
    throw new Error(result?.error?.reason || result?.message || "Upload Pinata gagal.");
  }

  return {
    ipfsUri: `ipfs://${result.IpfsHash}`,
    gatewayUrl: `https://ipfs.io/ipfs/${result.IpfsHash}`,
  };
}

async function uploadImageToPinata(fileName: string, bytes: Buffer) {
  if (!PINATA_JWT) throw new Error("PINATA_JWT belum diisi.");

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
  const file = new File([blob], fileName, { type: "image/png" });
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: fileName }));
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result?.IpfsHash) {
    throw new Error(result?.error?.reason || result?.message || "Upload image Pinata gagal.");
  }

  return {
    ipfsUri: `ipfs://${result.IpfsHash}`,
    gatewayUrl: `https://ipfs.io/ipfs/${result.IpfsHash}`,
  };
}

async function requireAdminUser(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) throw new Error("Token login admin tidak ditemukan.");

  const authed = getAuthedClient(token);
  const { data: userData, error: userError } = await authed.auth.getUser();
  if (userError || !userData.user) throw new Error("Sesi admin tidak valid.");

  const admin = getAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profil")
    .select("id,role,wallet_address,full_name,email")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) throw new Error("Profil admin tidak ditemukan.");
  if ((profile as Profile).role !== "admin") throw new Error("Hanya admin yang boleh melakukan mint.");

  return profile as Profile;
}

async function getAssessmentOrThrow(assessmentId: string) {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("penilaian")
    .select(`
      id,
      status,
      participant_id,
      recommendation,
      participant:profil!participant_id(id,wallet_address,full_name,email,nik)
    `)
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !data) throw new Error("Data penilaian tidak ditemukan.");
  const row = data as unknown as Assessment;
  if (row.status !== "approved") throw new Error("Hanya penilaian berstatus approved yang bisa di-mint.");
  if (!row.participant?.wallet_address) throw new Error("Wallet peserta tidak tersedia.");
  return row;
}

export async function POST(req: NextRequest) {
  try {
    if (!CONTRACT_ADDRESS) throw new Error("Alamat kontrak belum dikonfigurasi.");
    if (!DEPLOYER_PRIVATE_KEY) throw new Error("DEPLOYER_PRIVATE_KEY belum diisi.");

    const adminUser = await requireAdminUser(req);
    const { assessmentId } = await req.json();
    if (!assessmentId) {
      return NextResponse.json({ error: "assessmentId wajib diisi." }, { status: 400 });
    }

    const assessment = await getAssessmentOrThrow(String(assessmentId));
    const admin = getAdmin();

    const existingCertificate = await admin
      .from("sertifikat")
      .select("id,status,certificate_number,token_id,tx_hash,metadata_uri,ipfs_image_uri")
      .eq("assessment_id", assessment.id)
      .maybeSingle();

    if (existingCertificate.data?.token_id !== null && existingCertificate.data?.token_id !== undefined && existingCertificate.data?.status !== "revoked") {
      return NextResponse.json({ error: "Sertifikat untuk penilaian ini sudah pernah diterbitkan." }, { status: 409 });
    }

    const certificateNumber = existingCertificate.data?.certificate_number || buildCertificateNumber(assessment.id);
    const issuedAt = new Date().toISOString();
    const certificateImage = await renderCertificatePng({
      participantName: assessment.participant?.full_name || "Peserta",
      certificateNumber,
      trainingName: TRAINING_NAME,
      trainingField: TRAINING_FIELD,
      issuedAt,
      walletAddress: assessment.participant!.wallet_address,
      verifyUrl: `${req.nextUrl.origin}/verify?q=${certificateNumber}`,
    });
    if (!certificateImage || certificateImage.length === 0) {
      throw new Error(`Gagal membuat gambar sertifikat PNG untuk ${certificateNumber}.`);
    }

    const imageUpload = await uploadImageToPinata(`${certificateNumber}.png`, certificateImage);
    if (!imageUpload.ipfsUri || !imageUpload.gatewayUrl) {
      throw new Error(`Upload PNG ke Pinata gagal untuk ${certificateNumber}.`);
    }

    const metadataPayload = {
      name: CERTIFICATE_TITLE,
      description: `Sertifikat soulbound untuk pelatihan ${TRAINING_NAME}.`,
      image: imageUpload.ipfsUri,
      external_url: `${req.nextUrl.origin}/verify?q=${certificateNumber}`,
      attributes: [
        { trait_type: "Nomor Sertifikat", value: certificateNumber },
        { trait_type: "Peserta", value: assessment.participant?.full_name || "Peserta" },
        { trait_type: "Wallet Peserta", value: assessment.participant?.wallet_address },
        { trait_type: "Pelatihan", value: TRAINING_NAME },
        { trait_type: "Bidang", value: TRAINING_FIELD },
        { trait_type: "Penerbit", value: CERTIFICATE_ISSUER },
        { trait_type: "Status Penilaian", value: assessment.status },
      ],
    };
    if (!metadataPayload.image) {
      throw new Error(`Metadata JSON tidak memiliki field image untuk ${certificateNumber}.`);
    }

    const upload = await uploadJsonToPinata(`${certificateNumber}.json`, metadataPayload);
    if (!upload.ipfsUri || !upload.gatewayUrl) {
      throw new Error(`Upload metadata JSON ke Pinata gagal untuk ${certificateNumber}.`);
    }

    const account = privateKeyToAccount(normalizePrivateKey(DEPLOYER_PRIVATE_KEY));
    const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, chain: polygonAmoy, transport: http(RPC_URL) }).extend(publicActions);

    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESS,
      abi: MINT_ABI,
      functionName: "mintCertificate",
      args: [assessment.participant!.wallet_address as `0x${string}`, upload.ipfsUri],
    });

    const txHash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const transferLog = receipt.logs.find((log) => {
      try {
        const decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
        return decoded.eventName === "Transfer";
      } catch {
        return false;
      }
    });

    if (!transferLog) throw new Error("Transfer event tidak ditemukan setelah mint.");

    const decodedTransfer = decodeEventLog({ abi: [TRANSFER_EVENT], data: transferLog.data, topics: transferLog.topics });
    const tokenId = String(decodedTransfer.args.tokenId);
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.effectiveGasPrice ?? BigInt(0);
    const totalFeeWei = gasUsed * effectiveGasPrice;
    const totalFeeMatic = formatEther(totalFeeWei);
    const totalFeeIdr = Number(totalFeeMatic) * 10000;
    const mintedAt = issuedAt;

    if (!imageUpload.ipfsUri) {
      throw new Error(`ipfs_image_uri kosong untuk ${certificateNumber}.`);
    }
    if (!upload.ipfsUri) {
      throw new Error(`metadata_uri kosong untuk ${certificateNumber}.`);
    }

    const certPayload = {
      assessment_id: assessment.id,
      certificate_number: certificateNumber,
      participant_wallet: assessment.participant!.wallet_address.toLowerCase(),
      token_id: tokenId,
      tx_hash: txHash,
      ipfs_uri: upload.ipfsUri,
      ipfs_image_uri: imageUpload.ipfsUri,
      metadata_uri: upload.ipfsUri,
      status: "certified",
      minted_at: mintedAt,
      minted_by: adminUser.id,
      revoked_at: null,
      revoked_by: null,
      revocation_reason: null,
    };

    let certificateId = existingCertificate.data?.id as string | undefined;
    if (certificateId) {
      const { error } = await admin.from("sertifikat").update(certPayload).eq("id", certificateId);
      if (error) throw new Error(error.message);
    } else {
      const insertRes = await admin.from("sertifikat").insert(certPayload).select("id").single();
      if (insertRes.error || !insertRes.data?.id) throw new Error(insertRes.error?.message || "Gagal membuat row sertifikat.");
      certificateId = insertRes.data.id as string;
    }

    const { error: assessmentUpdateError } = await admin
      .from("penilaian")
      .update({ status: "certified", updated_at: mintedAt })
      .eq("id", assessment.id);
    if (assessmentUpdateError) throw new Error(assessmentUpdateError.message);

    await admin.from("log_transaksi").insert({
      certificate_id: certificateId,
      tx_hash: txHash,
      tx_type: "mint",
      wallet_address: assessment.participant!.wallet_address,
      status: "success",
      network: "Polygon Amoy",
    });

    await admin.from("log_aktivitas").insert({
      actor_id: adminUser.id,
      actor_role: "admin",
      activity_type: "mint_certificate",
      activity_detail: JSON.stringify({
        assessment_id: assessment.id,
        certificate_id: certificateId,
        certificate_number: certificateNumber,
        participant_wallet: assessment.participant!.wallet_address,
        token_id: tokenId,
        tx_hash: txHash,
      }),
      reference_table: "sertifikat",
      reference_id: certificateId,
    });

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificateId,
        certificate_number: certificateNumber,
        token_id: tokenId,
        tx_hash: txHash,
        metadata_uri: upload.ipfsUri,
        metadata_url: toIpfsGateway(upload.ipfsUri),
        ipfs_image_uri: imageUpload.ipfsUri,
        image_url: toIpfsGateway(imageUpload.ipfsUri),
        participant_wallet: assessment.participant!.wallet_address,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal melakukan mint sertifikat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
