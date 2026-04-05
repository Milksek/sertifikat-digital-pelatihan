import { createThirdwebClient, getContract, defineChain } from "thirdweb";
import { polygonAmoy } from "thirdweb/chains";
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
if (!clientId) {
  throw new Error("No client ID provided for Thirdweb");
}
export const client = createThirdwebClient({
  clientId: clientId,
});
const customPolygonAmoy = defineChain({
  id: polygonAmoy.id,
  rpc: "https://polygon-amoy-bor-rpc.publicnode.com" 
});
const contractAddress = process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT_ADDRESS;
export const certificateContract = contractAddress
  ? getContract({
      client,
      chain: customPolygonAmoy,
      address: contractAddress,
    })
  : null;
