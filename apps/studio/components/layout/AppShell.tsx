'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopHeader } from './TopHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { CommandPalette } from './CommandPalette';

interface AppShellProps {
  title: string;
  actionSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, actionSlot, children }: AppShellProps) {
  const pathname = usePathname();
  const [routeLoading, setRouteLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setRouteLoading(true);
    setProgress(0.12);
    const first = window.setTimeout(() => setProgress(0.7), 40);
    const second = window.setTimeout(() => setProgress(1), 140);
    const done = window.setTimeout(() => {
      setRouteLoading(false);
      setProgress(0);
    }, 220);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(done);
    };
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="route-progress">
        <span
          className="route-progress-bar"
          style={{
            transform: `scaleX(${routeLoading ? progress : 0})`,
          }}
        />
      </div>
      <AppSidebar />
      <SidebarInset>
        <TopHeader title={title} primaryAction={actionSlot} />
        <div className="page-enter flex flex-1 flex-col gap-6 p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </div>
        <MobileBottomNav />
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
