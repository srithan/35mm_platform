import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type FilterSidebarPreset = "festivals" | "discover" | "communities";

const PRESET_CLASSES: Record<
  FilterSidebarPreset,
  { top: string; height: string }
> = {
  festivals: {
    top: "lg:top-[calc(var(--site-header-sticky-offset,4.5rem)+52px+1rem)]",
    height:
      "lg:h-[calc(100vh-var(--site-header-sticky-offset,4.5rem)-52px-1.5rem-1rem)]",
  },
  discover: {
    top: "lg:top-[calc(var(--site-header-sticky-offset,4.5rem)+52px+1rem)]",
    height:
      "lg:h-[calc(100vh-var(--site-header-sticky-offset,4.5rem)-3.5rem-1rem)]",
  },
  communities: {
    top: "lg:top-[calc(var(--site-header-sticky-offset,4.5rem)+6px+1rem)]",
    height:
      "lg:h-[calc(100vh-var(--site-header-sticky-offset,4.5rem)-1.5rem-1rem)]",
  },
};

const asideBaseClass =
  "hidden lg:flex lg:flex-col lg:w-[320px] shrink-0 border-border lg:border-r lg:mb-0 lg:fixed lg:z-20 lg:left-[calc((100vw-min(100vw,var(--shell-main-max-width)))/2+1.5rem)] lg:overflow-hidden";

const sidebarHeaderClass = "shrink-0 pb-6 lg:pb-4 lg:pr-6";

const sidebarScrollClass =
  "min-h-0 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-6 lg:pb-4 overscroll-y-contain pb-6 lg:pb-0";

export interface FilterSidebarPageShellProps {
  rowClassName: string;
  preset: FilterSidebarPreset;
  sidebarHeader: ReactNode;
  sidebarBody: ReactNode;
  /** Defaults to `flex-1 min-w-0 lg:ml-[352px]` (320px sidebar + gap-8). */
  mainClassName?: string;
  children: ReactNode;
}

export function FilterSidebarPageShell({
  rowClassName,
  preset,
  sidebarHeader,
  sidebarBody,
  mainClassName,
  children,
}: FilterSidebarPageShellProps) {
  const geometry = PRESET_CLASSES[preset];
  const mainCn = mainClassName ?? "flex-1 min-w-0 lg:ml-[352px]";

  return (
    <div className={rowClassName}>
      <aside className={cn(asideBaseClass, geometry.top, geometry.height)}>
        <div className={sidebarHeaderClass}>{sidebarHeader}</div>
        <div className={sidebarScrollClass}>{sidebarBody}</div>
      </aside>
      <div className={mainCn}>{children}</div>
    </div>
  );
}
