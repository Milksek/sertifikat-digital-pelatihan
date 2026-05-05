# KOMPETEN.ID

Platform penerbitan dan verifikasi sertifikat keahlian berbasis Blockchain NFT.

## Teknologi

- **Frontend**: Next.js 15, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **Blockchain**: Thirdweb SDK, Polygon Network, Smart Contract Solidity (ERC-721A)
- **Storage**: IPFS (via Thirdweb)

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
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
NEXT_PUBLIC_CONTRACT_ADDRESS=
```

## Build untuk Produksi

```bash
npm run build
npm start
```
