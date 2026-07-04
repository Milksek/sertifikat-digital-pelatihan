"use client";
import { Sidebar } from "./sidebar";
import { Role } from "../providers/auth-provider";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}
export function DashboardLayout({
  children,
  allowedRoles: _allowedRoles,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100/80">
      <Sidebar />
      <main className="min-h-screen md:ml-64">
        <div className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] w-full items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

