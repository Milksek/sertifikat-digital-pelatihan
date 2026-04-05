"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout allowedRoles={["participant"]}>{children}</DashboardLayout>
  );
}
