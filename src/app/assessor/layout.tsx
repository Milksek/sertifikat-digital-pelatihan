"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
export default function AssessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout allowedRoles={["assessor", "admin"]}>
      {children}
    </DashboardLayout>
  );
}

