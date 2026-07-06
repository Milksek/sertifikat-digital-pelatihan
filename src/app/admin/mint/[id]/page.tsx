"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CERTIFICATE_ISSUER, CERTIFICATE_TITLE, TRAINING_FIELD, TRAINING_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AssessmentDetail = {
  id: string;
  participant_id: string;
  status: string;
  recommendation: string | null;
  score: Record<string, unknown> | null;
  participant?: { full_name: string | null; wallet_address: string } | null;
};

export default function AdminMintDetailPage() {
  const params = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    supabase
      .from("penilaian")
      .select(`id,participant_id,status,recommendation,score,participant:profil!participant_id(full_name,wallet_address)`)
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }) => setAssessment((data as unknown as AssessmentDetail) || null));
  }, [params?.id]);

  const metadataPreview = useMemo(() => ({
    name: CERTIFICATE_TITLE,
    training_name: TRAINING_NAME,
    training_field: TRAINING_FIELD,
    issuer: CERTIFICATE_ISSUER,
    participant_name: assessment?.participant?.full_name || "Peserta",
  }), [assessment]);

  const handleCreateDraft = async () => {
    if (!assessment?.participant?.wallet_address) return;
    setSaving(true);
    const { error } = await supabase.from("sertifikat").insert({
      assessment_id: assessment.id,
      participant_wallet: assessment.participant.wallet_address,
      training_name: TRAINING_NAME,
      training_field: TRAINING_FIELD,
      status: "active",
      metadata_uri: JSON.stringify(metadataPreview),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Draft sertifikat berhasil dibuat.");
  };

  if (!assessment) {
    return <div className="text-slate-600">Data penilaian tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Detail Penerbitan Sertifikat</h1>
        <p className="text-slate-600 mt-2">Semua metadata memakai format final pelatihan tunggal.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <p className="text-sm text-slate-500">Peserta</p>
            <p className="text-lg font-semibold text-slate-900">{assessment.participant?.full_name || "Peserta"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Wallet</p>
            <p className="text-sm font-medium text-slate-900 break-all">{assessment.participant?.wallet_address}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Status Penilaian</p>
            <p className="text-sm font-medium text-slate-900">{assessment.status}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Rekomendasi</p>
            <p className="text-sm font-medium text-slate-900">{assessment.recommendation || "-"}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Preview Metadata Final</h2>
          <pre className="rounded-2xl bg-slate-950 text-slate-100 p-4 text-xs overflow-auto">{JSON.stringify(metadataPreview, null, 2)}</pre>
          <Button onClick={handleCreateDraft} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Menyimpan..." : "Buat Draft Sertifikat"}
          </Button>
          <p className="text-xs text-slate-500">Halaman ini hanya membuat draft data sertifikat. Tidak melakukan deploy smart contract.</p>
        </div>
      </div>
    </div>
  );
}
