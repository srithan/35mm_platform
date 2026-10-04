"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BROWSE_CHROME_VARIANT,
  BROWSE_DENSITY_VARIANT,
} from "@/lib/config/uiFlags";
import { cn } from "@/lib/utils/cn";

type FocusedBrowseNavigationItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  badgeCount?: number;
  href?: string;
  onClick?: () => void;
};

interface FocusedBrowseNavigationProps {
  items: readonly FocusedBrowseNavigationItem[];
  activeItemId: string;
  navAriaLabel: string;
}

export function isFocusedBrowseNavigationEnabled(): boolean {
  return BROWSE_CHROME_VARIANT === "focused" && BROWSE_DENSITY_VARIANT === "compact";
}

/** Opaque counterpart to 70mm's focused icon-pill navigation. */
export function FocusedBrowseNavigation({
  items,
  activeItemId,
  navAriaLabel,
}: FocusedBrowseNavigationProps) {
  return (
    <div
      data-sticky-chrome=""
      className="sticky top-[var(--mobile-header-sticky-offset,calc(max(0.75rem,env(safe-area-inset-top,0px))+3.25rem))] z-40 w-full border-b border-border bg-bg md:top-0"
    >
      <nav
        aria-label={navAriaLabel}
        className="scrollbar-hide mx-auto flex min-h-[62px] w-full max-w-[var(--shell-main-max-width,1400px)] items-center justify-start gap-1 overflow-x-auto px-4 py-2 sm:justify-center sm:gap-2 sm:px-6"
      >
        {items.map(function (item) {
          const active = item.id === activeItemId;
          const content = (
            <>
              {item.icon ? <span className="h-4 w-4 shrink-0" aria-hidden>{item.icon}</span> : null}
              {item.label}
              {(item.badgeCount ?? 0) > 0 ? (
                <span className="unread-notification-badge ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full font-sans text-[9px] tabular-nums">
                  {item.badgeCount}
                </span>
              ) : null}
            </>
          );
          const itemClasses = cn(
            "inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none",
            active ? "bg-fg text-bg" : "text-fg-muted hover:bg-sunken hover:text-fg",
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={itemClasses}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={item.onClick}
              className={itemClasses}
            >
              {content}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
