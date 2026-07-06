export function buildCertificateNumber(assessmentId: string): string {
  const suffix = assessmentId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `SDP-JWD-${suffix}`;
}
