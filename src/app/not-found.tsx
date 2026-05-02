import Link from "next/link";
import { Shield, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans px-6 text-center">
      {}
      <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 mb-12">
        <Shield className="w-6 h-6 text-blue-600" />
        KOMPETEN.ID
      </div>

      {}
      <div className="relative mb-8">
        <p className="text-[120px] md:text-[180px] font-extrabold text-slate-100 leading-none select-none">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Search className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 mb-3">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-slate-500 max-w-md mb-8">
        Halaman yang Anda cari tidak ada atau mungkin sudah dipindahkan.
        Silakan kembali ke beranda atau cek keaslian sertifikat Anda.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2 h-11 px-6">
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Button>
        </Link>
        <Link href="/verify">
          <Button variant="outline" className="gap-2 h-11 px-6 border-slate-200">
            <Shield className="w-4 h-4" /> Verifikasi Sertifikat
          </Button>
        </Link>
      </div>

      <p className="text-xs text-slate-400 mt-12">
        © {new Date().getFullYear()} KOMPETEN.ID — Identitas Kompetensi Anda, Terjamin di Blockchain
      </p>
    </div>
  );
}
