const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || "";
export const uploadFileToIPFS = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const checkRes = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: formData,
      },
    );
    if (!checkRes.ok) {
      const text = await checkRes.text();
      throw new Error(`Pinata File Upload Failed: ${text}`);
    }
    const resData = await checkRes.json();
    return `ipfs://${resData.IpfsHash}`;
  } catch (error: unknown) {
    console.error("Error uploading file to Pinata:", error);
    throw error;
  }
};
export const uploadJsonToIPFS = async (jsonData: Record<string, unknown>) => {
  try {
    const checkRes = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: JSON.stringify({
          pinataContent: jsonData,
          pinataMetadata: { name: jsonData.name || "metadata.json" },
        }),
      },
    );
    if (!checkRes.ok) {
      const text = await checkRes.text();
      throw new Error(`Pinata JSON Upload Failed: ${text}`);
    }
    const resData = await checkRes.json();
    return `ipfs://${resData.IpfsHash}`;
  } catch (error: unknown) {
    console.error("Error uploading JSON to Pinata:", error);
    throw error;
  }
};
