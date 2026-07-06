'use client';

import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUiStore } from '@/stores/uiStore';

const pageLabels: Record<string, string> = {
  dashboard: 'Overview',
  users: 'Users',
  content: 'Content',
  moderation: 'Moderation',
  films: 'Films',
  shelves: 'Shelves',
  import: 'Import',
  queues: 'Queues',
  infrastructure: 'Infrastructure',
  apis: 'APIs',
  settings: 'Settings',
};

export function TopHeader({
  title,
  primaryAction,
}: {
  title: string;
  primaryAction?: React.ReactNode;
}) {
  const pathname = usePathname();
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);

  const segments = pathname.split('/').filter(Boolean);
  const section = segments[0] || 'dashboard';

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1 md:hidden" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
            </BreadcrumbItem>
            {segments.length > 0 ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageLabels[section] || title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="truncate text-lg font-semibold tracking-tight sm:hidden">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 gap-1.5 text-muted-foreground sm:flex"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="size-3.5" />
          <span className="text-xs">Search</span>
          <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </Button>
        {primaryAction}
      </div>
    </header>
  );
}
