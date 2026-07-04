import { createThirdwebClient, getContract, defineChain } from "thirdweb";
import { polygonAmoy } from "thirdweb/chains";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim();
export const hasThirdwebClient = Boolean(clientId);

export const client = hasThirdwebClient
  ? createThirdwebClient({
      clientId,
    })
  : null;

export const appChain = defineChain({
  id: polygonAmoy.id,
  rpc: "https://polygon-amoy-bor-rpc.publicnode.com",
});

const rawContractAddress = process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS?.trim();
const contractAddress = rawContractAddress && /^0x[a-fA-F0-9]{40}$/.test(rawContractAddress)
  ? rawContractAddress
  : null;

export const certificateContract = client && contractAddress
  ? getContract({
      client,
      chain: appChain,
      address: contractAddress,
    })
  : null;
