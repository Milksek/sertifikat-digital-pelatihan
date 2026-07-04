import Link from "next/link";
import { Home, ArrowLeft, AlertCircle, ShieldOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  
  title?: string;
  
  description?: string;
  
  variant?: "not-found" | "error" | "unauthorized";
  
  showHome?: boolean;
  
  backHref?: string;
  
  backLabel?: string;
  
  onBack?: () => void;
}

const icons = {
  "not-found": Search,
  "error": AlertCircle,
  "unauthorized": ShieldOff,
};

const defaultTitles = {
  "not-found": "Data Tidak Ditemukan",
  "error": "Terjadi Kesalahan",
  "unauthorized": "Akses Ditolak",
};

const defaultDescriptions = {
  "not-found": "Data yang Anda cari tidak ada atau sudah dihapus.",
  "error": "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
  "unauthorized": "Anda tidak memiliki izin untuk mengakses halaman ini.",
};

const colors = {
  "not-found": "bg-slate-100 text-slate-500",
  "error": "bg-red-50 text-red-500",
  "unauthorized": "bg-amber-50 text-amber-500",
};

export function ErrorState({
  title,
  description,
  variant = "not-found",
  showHome = true,
  backHref,
  backLabel = "Kembali",
  onBack,
}: ErrorStateProps) {
  const Icon = icons[variant];
  const color = colors[variant];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${color}`}
      >
        <Icon className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-2">
        {title ?? defaultTitles[variant]}
      </h2>
      <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
        {description ?? defaultDescriptions[variant]}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {(backHref || onBack) && (
          onBack ? (
            <Button variant="outline" className="gap-2" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </Button>
          ) : (
            <Link href={backHref!}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> {backLabel}
              </Button>
            </Link>
          )
        )}
        {showHome && (
          <Link href="/">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Home className="w-4 h-4" /> Kembali ke Beranda
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

