# Sistem Sertifikat Digital Pelatihan

Platform penerbitan dan verifikasi sertifikat pelatihan keahlian profesional berbasis Soulbound Token pada jaringan Polygon Amoy.

## Teknologi

- **Frontend**: Next.js 16.1.6, TypeScript 5.9.3, Tailwind CSS 3.4.19, shadcn/ui
- **Backend**: Supabase, PostgreSQL, Row-Level Security (RLS)
- **Blockchain**: Solidity 0.8.20, Thirdweb SDK 5.119.0, Polygon Amoy
- **Storage**: IPFS via Pinata
- **Testing**: Hardhat 2.28.6, Slither 0.11.5

## Studi Kasus

**Pelatihan Pengembangan Web Dasar** — Penerbitan dan verifikasi sertifikat berbasis Soulbound Token (ERC-721A non-transferable) di jaringan Polygon Amoy.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Environment Variables

Salin `.env.local.example` menjadi `.env.local` dan isi nilai yang sesuai:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=
PINATA_JWT=
MASTER_WALLET_ADDRESS=
```

## Build untuk Produksi

```bash
npm run build
npm start
```
