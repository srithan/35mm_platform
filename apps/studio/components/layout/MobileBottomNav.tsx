'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Braces, Clapperboard, Gauge, Server, Shield } from 'lucide-react';
import { useStudioAccess } from '@/components/auth/useStudioAccess';
import { hasStudioPermission, type StudioPermission } from '@/lib/auth/accessControl';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', icon: Gauge, label: 'Overview', permission: 'dashboard:view' },
  { href: '/content', icon: Clapperboard, label: 'Content', permission: 'content:view' },
  { href: '/moderation', icon: Shield, label: 'Review', permission: 'moderation:view' },
  { href: '/infrastructure', icon: Server, label: 'Systems', permission: 'systems:view' },
  { href: '/apis', icon: Braces, label: 'APIs', permission: 'systems:view' },
] satisfies Array<{
  href: string;
  icon: typeof Gauge;
  label: string;
  permission: StudioPermission;
}>;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role } = useStudioAccess();
  const visibleItems = items.filter((item) => hasStudioPermission(role, item.permission));

  return (
    <nav className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center border-t bg-background/95 px-2 pb-safe backdrop-blur-md md:hidden">
      {visibleItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-lg transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : '',
              )}
            >
              <Icon className="size-4" />
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
