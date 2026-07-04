export const assessmentStatusLabels = {
  pending: "Menunggu Penugasan Asesor",
  in_progress: "Sedang Dinilai",
  evaluated: "Sudah Dinilai",
  approved: "Lulus / Siap Diterbitkan",
  rejected: "Belum Kompeten",
  certified: "Sertifikat Sudah Diterbitkan",
} as const;

export type AssessmentStatusKey = keyof typeof assessmentStatusLabels;

export function getAssessmentStatusLabel(status?: string | null) {
  if (!status) return "-";
  return assessmentStatusLabels[status as AssessmentStatusKey] || status;
}

export function getAssessmentStatusBadgeClass(status?: string | null) {
  switch (status) {
    case "approved":
    case "certified":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "evaluated":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}
