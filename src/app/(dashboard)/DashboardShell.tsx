'use client';

import { AppSidebar, AppMobileHeader, AppMobileNav } from '@/app/components/AppNav';

interface DashboardShellProps {
  userName: string;
  goalLabel: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({ userName, goalLabel, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-canvas-50">
      <div className="flex">
        <AppSidebar userName={userName} goalLabel={goalLabel} />
        <div className="flex-1 min-w-0">
          <AppMobileHeader userName={userName} />
          <main className="p-5 lg:p-8 pb-28 lg:pb-8">
            <div className="max-w-5xl mx-auto">
              {children}
            </div>
          </main>
          <AppMobileNav />
        </div>
      </div>
    </div>
  );
}
