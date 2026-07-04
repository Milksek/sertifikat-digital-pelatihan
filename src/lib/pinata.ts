export const uploadFileToIPFS = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/ipfs/upload-file", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload gagal" }));
      throw new Error(err.error || `Upload file gagal (${res.status})`);
    }

    const data = await res.json();
    return data.ipfsUri as string;
  } catch (error: unknown) {
    console.error("Error uploading file to IPFS:", error);
    throw error;
  }
};

export const uploadJsonToIPFS = async (jsonData: Record<string, unknown>) => {
  try {
    const res = await fetch("/api/ipfs/upload-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload gagal" }));
      throw new Error(err.error || `Upload metadata gagal (${res.status})`);
    }

    const data = await res.json();
    return data.ipfsUri as string;
  } catch (error: unknown) {
    console.error("Error uploading JSON to IPFS:", error);
    throw error;
  }
};

