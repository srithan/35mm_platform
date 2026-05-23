"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils/cn";

interface MobileHeaderProps {
  /** Called when profile picture is clicked (opens MobileSidebar) */
  onProfileClick?: () => void;
  /** Page title shown in center. If omitted, shows 35mm logo. */
  title?: string;
  /** Right-side slot (e.g. settings + compose buttons for chat) */
  rightSlot?: React.ReactNode;
  /** Hide bottom border when sticky tabs or search bar is directly below */
  hideBottomBorder?: boolean;
}

export function MobileHeader({
  onProfileClick,
  title,
  rightSlot,
  hideBottomBorder = false,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 min-h-14 py-3 pl-4 pr-[calc(1rem+var(--app-scrollbar-gutter,0px))] grid grid-cols-[auto_1fr_auto] items-center gap-2 bg-bg/95 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]",
        !hideBottomBorder && "border-b border-border"
      )}
      role="banner"
    >
      <button
        type="button"
        onClick={onProfileClick}
        className="flex items-center justify-center w-10 h-10 -ml-1 rounded-full active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="Open menu"
      >
        <Avatar initial="S" size="md" variant="ring" />
      </button>

      <div className="min-w-0 flex justify-center overflow-hidden">
        {title ? (
          <h1 className="font-semibold text-[17px] text-fg truncate">
            {title}
          </h1>
        ) : (
          <Link
            href={ROUTES.HOME}
            className="px-3 py-1 flex flex-col items-center justify-center no-underline shrink-0"
            aria-label="35mm.in Home"
          >
            <div className="text-[20.5px] font-semibold tracking-wide text-fg">
              35<span className="text-accent">mm</span>
            </div>
          </Link>
        )}
      </div>

      <div className="min-w-10 flex items-center justify-end gap-1 shrink-0">
        {rightSlot}
      </div>
    </header>
  );
}
