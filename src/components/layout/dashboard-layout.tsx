"use client";
import { Sidebar } from "./sidebar";
import { RoleGuard } from "./role-guard";
import { Role } from "../providers/auth-provider";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}
export function DashboardLayout({
  children,
  allowedRoles,
}: DashboardLayoutProps) {
  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="md:ml-64 p-8 min-h-screen transition-all">
          <Suspense
            fallback={
              <div className="flex h-full w-full justify-center mt-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </RoleGuard>
  );
}
