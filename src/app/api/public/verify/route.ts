import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, http, parseAbi } from "viem";
import { polygonAmoy } from "viem/chains";
import { TRAINING_FIELD, TRAINING_NAME } from "@/lib/app-config";

const POLYGON_AMOY_RPC =
  process.env.POLYGON_AMOY_RPC_URL ||
  "https://rpc-amoy.polygon.technology";

const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS || ""
).trim().toLowerCase();

const SBT_ABI = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
]);

const viemClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(POLYGON_AMOY_RPC),
});

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment belum lengkap.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function checkOnChain(tokenId: string | null, participantWallet: string | null): Promise<{
  checked: boolean;
  owner_match: boolean | null;
  on_chain_owner: string | null;
  token_uri: string | null;
  error: string | null;
  burned?: boolean;
}> {
  const noContract = !CONTRACT_ADDRESS || CONTRACT_ADDRESS === "isi_alamat_kontrak_jika_sudah_ada";
  if (noContract || tokenId === null || tokenId === undefined || tokenId === "") {
    return { checked: false, owner_match: null, on_chain_owner: null, token_uri: null, error: noContract ? "Kontrak belum dikonfigurasi" : "Token ID tidak tersedia" };
  }

  try {
    const tokenIdBigInt = BigInt(tokenId);
    const contractAddr = CONTRACT_ADDRESS as `0x${string}`;

    let owner: string | null = null;
    let uri: string | null = null;
    let isBurned = false;

    try {
      owner = await viemClient.readContract({
        address: contractAddr,
        abi: SBT_ABI,
        functionName: "ownerOf",
        args: [tokenIdBigInt],
      }) as string;
    } catch (e: any) {
      const msg = (e?.shortMessage || e?.message || "").toLowerCase();
      if (msg.includes("revert") || msg.includes("reverted") || msg.includes("0x") || msg.includes("nonexistent") || msg.includes("token does not exist")) {
        isBurned = true;
      } else {
        throw e;
      }
    }

    if (!isBurned) {
      try {
        uri = await viemClient.readContract({
          address: contractAddr,
          abi: SBT_ABI,
          functionName: "tokenURI",
          args: [tokenIdBigInt],
        }) as string;
      } catch {
        uri = null;
      }
    }

    if (isBurned) {
      return {
        checked: true,
        owner_match: false,
        on_chain_owner: null,
        token_uri: null,
        error: "Token sudah dibakar (burned) di blockchain",
        burned: true,
      };
    }

    const ownerLower = (owner as string).toLowerCase();
    const walletLower = (participantWallet || "").toLowerCase();
    return {
      checked: true,
      owner_match: ownerLower === walletLower,
      on_chain_owner: ownerLower,
      token_uri: uri as string | null,
      error: null,
      burned: false,
    };
  } catch (e: any) {
    return {
      checked: true,
      owner_match: null,
      on_chain_owner: null,
      token_uri: null,
      error: e?.shortMessage || e?.message || "Gagal query blockchain",
      burned: false,
    };
  }
}

async function findCertificateByTokenId(supabase: ReturnType<typeof getAdmin>, tokenId: string) {
  const normalizedTokenId = tokenId.trim();
  if (!normalizedTokenId || !/^\d+$/.test(normalizedTokenId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("sertifikat")
    .select(`
      id,
      certificate_number,
      participant_wallet,
      token_id,
      tx_hash,
      ipfs_image_uri,
      metadata_uri,
      status,
      minted_at,
      revoked_at,
      revocation_reason,
      assessment:penilaian!assessment_id(
        recommendation,
        score,
        participant:profil!participant_id(full_name)
      )
    `)
    .eq("token_id", normalizedTokenId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const d = data as unknown as {
    id: string; certificate_number: string; participant_wallet: string; token_id: string;
    tx_hash: string; ipfs_image_uri: string; metadata_uri: string; status: string;
    minted_at: string; revoked_at: string | null; revocation_reason: string | null;
    assessment?: { recommendation?: string; score?: unknown; participant?: { full_name?: string } } | null;
  };

  const certId = d.id;
  let burnTxHash = null;
  if (d.status === "revoked") {
    const { data: burnLog } = await supabase
      .from("log_transaksi")
      .select("tx_hash")
      .eq("certificate_id", certId)
      .eq("tx_type", "burn")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    burnTxHash = burnLog?.tx_hash ?? null;
  }

  return {
    certificate_number: d.certificate_number,
    training_name: TRAINING_NAME,
    training_field: TRAINING_FIELD,
    participant_wallet: d.participant_wallet,
    token_id: d.token_id,
    tx_hash: d.tx_hash,
    burn_tx_hash: burnTxHash,
    ipfs_image_uri: d.ipfs_image_uri,
    metadata_uri: d.metadata_uri,
    status: d.status,
    minted_at: d.minted_at,
    revoked_at: d.revoked_at,
    revocation_reason: d.revocation_reason,
    participant_name: d.assessment?.participant?.full_name ?? null,
    recommendation: d.assessment?.recommendation ?? null,
    score: d.assessment?.score ?? null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    const trimmed = String(query || "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Kata kunci verifikasi wajib diisi." }, { status: 400 });
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const verifierIp = forwarded?.split(",")[0]?.trim() || "public";
    const supabase = getAdmin();

    const isNumeric = /^\d+$/.test(trimmed);
    let result = isNumeric ? await findCertificateByTokenId(supabase, trimmed) : null;

    if (!result && !isNumeric) {
      const { data, error } = await supabase.rpc("verify_certificate_public", {
        search_query: trimmed,
        verifier_ip_input: verifierIp,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      result = Array.isArray(data) ? data[0] : data;
    }

    if (!result) {
      return NextResponse.json({ found: false, error: "Sertifikat tidak ditemukan." }, { status: 404 });
    }
    const onChain = await checkOnChain(result.token_id, result.participant_wallet);

    return NextResponse.json({
      found: true,
      result: {
        ...result,
        on_chain: onChain,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat memverifikasi sertifikat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}




