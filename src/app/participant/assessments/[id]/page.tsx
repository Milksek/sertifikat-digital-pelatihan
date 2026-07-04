"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AssessmentDetail = { id: string; status: string; recommendation: string | null; score: Record<string, unknown> | null; training_name: string; training_field: string; created_at: string; updated_at: string; };

export default function ParticipantAssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    supabase.from("penilaian").select("id,status,recommendation,score,training_name,training_field,created_at,updated_at").eq("id", params.id).maybeSingle().then(({ data }) => setAssessment((data as AssessmentDetail) || null));
  }, [params?.id]);

  if (!assessment) return <div className="text-slate-600">Data penilaian tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-slate-900">Detail Penilaian</h1><p className="text-slate-600 mt-2">Informasi lengkap hasil penilaian peserta.</p></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div><p className="text-sm text-slate-500">Pelatihan</p><p className="font-semibold text-slate-900">{assessment.training_name}</p></div>
        <div><p className="text-sm text-slate-500">Bidang</p><p className="font-semibold text-slate-900">{assessment.training_field}</p></div>
        <div><p className="text-sm text-slate-500">Status</p><p className="font-semibold text-slate-900">{assessment.status}</p></div>
        <div><p className="text-sm text-slate-500">Rekomendasi</p><p className="font-semibold text-slate-900">{assessment.recommendation || "-"}</p></div>
        <div><p className="text-sm text-slate-500">Skor</p><pre className="rounded-2xl bg-slate-950 text-slate-100 p-4 text-xs overflow-auto">{JSON.stringify(assessment.score || {}, null, 2)}</pre></div>
      </div>
    </div>
  );
}
