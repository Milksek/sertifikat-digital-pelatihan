import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseAbi,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";

export const runtime = "nodejs";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS || "").trim() as `0x${string}` | undefined;
const RPC_URL = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | string | undefined;

const BURN_ABI = parseAbi(["function adminBurn(uint256 tokenId)"]);

function normalizePrivateKey(value: string) {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

export async function POST(request: NextRequest) {
  try {
    const { id, reason, wallet_address } = await request.json();

    if (!id || !reason || !wallet_address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS belum dikonfigurasi.");
    if (!DEPLOYER_PRIVATE_KEY) throw new Error("DEPLOYER_PRIVATE_KEY belum diisi.");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profil } = await supabase
      .from("profil")
      .select("id, role")
      .eq("wallet_address", wallet_address)
      .single();

    if (!profil || profil.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: cert } = await supabase
      .from("sertifikat")
      .select("id, token_id, status")
      .eq("id", id)
      .single();

    if (!cert) {
      return NextResponse.json({ error: "Sertifikat tidak ditemukan" }, { status: 404 });
    }

    let txHash = null;
    let burnSuccess = false;

    if (cert.token_id && cert.status !== "revoked") {
      const account = privateKeyToAccount(normalizePrivateKey(DEPLOYER_PRIVATE_KEY));
      const publicClient = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
      const walletClient = createWalletClient({ account, chain: polygonAmoy, transport: http(RPC_URL) }).extend(publicActions);

      const tokenIdBigInt = BigInt(cert.token_id);

      const { request } = await publicClient.simulateContract({
        account,
        address: CONTRACT_ADDRESS,
        abi: BURN_ABI,
        functionName: "adminBurn",
        args: [tokenIdBigInt],
      });

      txHash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      burnSuccess = true;
    }

    const { data, error } = await supabase
      .from("sertifikat")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
        revoked_by: profil.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (txHash) {
      await supabase.from("log_transaksi").insert({
        certificate_id: id,
        tx_hash: txHash,
        tx_type: "burn",
        wallet_address: wallet_address,
        status: "success",
        network: "Polygon Amoy",
      });
    }

    await supabase.from("log_aktivitas").insert({
      actor_id: profil.id,
      actor_role: "admin",
      activity_type: "revoke_certificate",
      activity_detail: JSON.stringify({
        certificate_id: id,
        token_id: cert.token_id,
        tx_hash: txHash,
        burn_on_chain: burnSuccess,
      }),
      reference_table: "sertifikat",
      reference_id: id,
    });

    return NextResponse.json({
      success: true,
      data,
      blockchain: {
        burn: burnSuccess,
        tx_hash: txHash,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
