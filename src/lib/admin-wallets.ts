// Daftar wallet address yang memiliki role admin (case-insensitive)
// Format: checksum address atau lowercase, akan di-normalize ke lowercase
const ADMIN_WALLET_LIST = [
  "0x1cb90a414ade635dcfa78e41a825c789edde4d8e", // Master wallet (original)
  "0x07c0d69a15B01dc830156a4048389A7d80E2C4d6", // Admin UAT
] as const;

const _adminWalletsLower = new Set(ADMIN_WALLET_LIST.map((w) => w.toLowerCase()));

export function isAdminWallet(address: string | null | undefined): boolean {
  if (!address) return false;
  return _adminWalletsLower.has(address.toLowerCase());
}

export { ADMIN_WALLET_LIST };
