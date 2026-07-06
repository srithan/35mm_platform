'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Aperture } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useStudioAccess } from '@/components/auth/useStudioAccess';
import { filterAdminNavGroups } from '@/lib/auth/accessControl';
import { isStudioClerkEnabled } from '@/lib/auth/clerkConfig';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

export function AppSidebar() {
  const pathname = usePathname();
  const { role, roleLabel } = useStudioAccess();
  const navGroups = filterAdminNavGroups(role);

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="[&_[data-slot=sidebar-inner]]:border-r [&_[data-slot=sidebar-inner]]:border-sidebar-border/80 [&_[data-slot=sidebar-inner]]:bg-sidebar/95 [&_[data-slot=sidebar-inner]]:shadow-[8px_0_30px_rgba(15,23,42,0.04)] [&_[data-slot=sidebar-inner]]:backdrop-blur"
    >
      <SidebarHeader className="border-b border-sidebar-border/70 px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent/70"
        >
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm ring-1 ring-foreground/10">
            <Aperture className="size-4" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">35mm Studio</span>
            <span className="text-[11px] font-medium text-muted-foreground">Platform admin</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2.5 py-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="px-0 py-1.5">
            <SidebarGroupLabel className="h-6 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              <span className="mr-2 size-1 rounded-full bg-sidebar-border" />
              <span>{group.label}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          'relative h-9 rounded-xl px-2.5 text-sidebar-foreground/70 transition-all duration-150 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-sm',
                          'data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-sm data-active:ring-1 data-active:ring-sidebar-border/70',
                          'data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:h-5 data-active:before:w-1 data-active:before:-translate-y-1/2 data-active:before:rounded-r-full data-active:before:bg-foreground',
                          '[&_svg]:text-sidebar-foreground/45 data-active:[&_svg]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center',
                        )}
                        render={
                          <Link href={item.href} className="font-medium">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-transparent transition-colors group-data-active/menu-button:bg-background/70 group-data-active/menu-button:shadow-xs">
                              <Icon className="size-4" />
                            </span>
                            <span>{item.label}</span>
                          </Link>
                        }
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator className="mx-4 bg-sidebar-border/70" />

      <SidebarFooter className="p-3">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 p-2 shadow-sm group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none">
          {isStudioClerkEnabled ? (
            <SidebarUser roleLabel={roleLabel} />
          ) : (
            <SidebarUserFallback roleLabel={roleLabel} />
          )}
          <ThemeToggle />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function SidebarUser({ roleLabel }: { roleLabel: string }) {
  const { user } = useUser();
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User';

  return <SidebarUserSummary displayName={displayName} roleLabel={roleLabel} />;
}

function SidebarUserFallback({ roleLabel }: { roleLabel: string }) {
  return <SidebarUserSummary displayName="Studio" roleLabel={roleLabel} />;
}

function SidebarUserSummary({ displayName, roleLabel }: { displayName: string; roleLabel: string }) {
  const initials = getInitials(displayName);

  return (
    <div className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden">
      <Avatar className="size-8 ring-1 ring-sidebar-border">
        <AvatarFallback className="bg-background text-xs font-semibold text-foreground">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-4">{displayName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
      </div>
    </div>
  );
}

function getInitials(value: string): string {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
