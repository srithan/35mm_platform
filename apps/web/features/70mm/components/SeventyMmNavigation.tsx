"use client";

import Link from "next/link";
import { BarChart3, Clapperboard, Upload } from "lucide-react";
import {
  BROWSE_CHROME_VARIANT,
  BROWSE_DENSITY_VARIANT,
} from "@/lib/config/uiFlags";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type SeventyMmNavigationProps = {
  active: "browse" | "upload" | "studio";
};

export function isSeventyMmFocusedExperience(): boolean {
  return (
    BROWSE_CHROME_VARIANT === "focused" && BROWSE_DENSITY_VARIANT === "compact"
  );
}

export function SeventyMmNavigation({ active }: SeventyMmNavigationProps) {
  const focusedExperience = isSeventyMmFocusedExperience();
  const links = [
    {
      label: "Browse",
      href: ROUTES.SEVENTY_MM,
      icon: Clapperboard,
      current: active === "browse",
    },
    {
      label: "Upload",
      href: ROUTES.SEVENTY_MM_UPLOAD,
      icon: Upload,
      current: active === "upload",
    },
    {
      label: "Studio",
      href: ROUTES.SEVENTY_MM_STUDIO,
      icon: BarChart3,
      current: active === "studio",
    },
  ];

  return (
    <div
      className={cn(
        "sticky top-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))] z-40 w-full border-b border-border bg-bg/95 backdrop-blur-md",
        "md:top-[var(--site-header-sticky-offset,4.5rem)]",
        focusedExperience && "md:top-0",
      )}
    >
      <nav
        aria-label="70mm navigation"
        className={cn(
          "scrollbar-hide mx-auto flex min-h-[62px] w-full max-w-[var(--shell-main-max-width,1400px)] items-center justify-start gap-1 overflow-x-auto px-4 py-2 sm:justify-center sm:gap-2 sm:px-6",
        )}
      >
        {links.map(function (item) {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none",
                item.current
                  ? "bg-fg text-bg"
                  : "text-fg-muted hover:bg-sunken hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
