import { cn } from "@/lib/utils/cn";

/** Shared list-style controls for left-column filters (Discover / Festivals / Communities). */
export const sidebarFilterSectionTitle = "text-[13px] font-semibold text-fg tracking-tight";

export const sidebarFilterListWrap =
  "rounded-xl border border-border bg-elevated overflow-hidden";

export function sidebarFilterRowBase(selected: boolean) {
  return cn(
    "w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] leading-snug transition-colors",
    "border-b border-border last:border-b-0 rounded-none",
    selected
      ? "bg-fg text-bg font-medium"
      : "bg-elevated text-fg hover:bg-hover"
  );
}

export function sidebarFilterToggleRow(active: boolean) {
  return cn(
    "w-full flex items-center gap-3 px-3 py-2.5 text-left text-[13px] leading-snug transition-colors",
    "border-b border-border last:border-b-0 rounded-none",
    active ? "bg-accent/10 text-fg" : "bg-elevated text-fg hover:bg-hover"
  );
}

/** Wrapping pill chips (Discover sidebar) — active = solid fg, inactive = bordered ghost. */
export function discoverFilterChipClasses(selected: boolean) {
  return cn(
    "px-3 py-1.5 rounded-full text-[12px] leading-snug transition-all whitespace-nowrap",
    selected
      ? "bg-fg text-bg font-medium shadow-sm hover:opacity-90 active:scale-95"
      : "border border-border bg-transparent text-fg-muted hover:text-fg hover:border-border-strong hover:bg-elevated active:scale-95"
  );
}
