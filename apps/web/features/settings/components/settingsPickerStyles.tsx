import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const selectedOutlineClass = [
  "border-2 border-[color-mix(in_srgb,var(--fg)_30%,var(--border-strong))]",
  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--fg)_12%,transparent)]",
];

/** Shared selected/unselected chrome for Settings theme + accent pickers. */
export function settingsPickerCardClass(options: {
  selected: boolean;
  enabled?: boolean;
}) {
  var enabled = options.enabled !== false;

  return cn(
    "border transition-colors",
    options.selected && enabled
      ? cn("bg-hover", selectedOutlineClass)
      : "border-border bg-elevated",
    enabled && !options.selected && "hover:bg-hover/60"
  );
}

export function settingsPickerChipClass(selected: boolean) {
  return cn(
    "border bg-elevated transition-all",
    selected
      ? cn("scale-[1.04] bg-hover", selectedOutlineClass)
      : "border-border hover:bg-hover/60"
  );
}

export function SettingsPickerCheck({ className }: { className?: string }) {
  return (
    <SettingsPickerCheckBadge
      className={cn("pointer-events-none absolute top-1.5 right-1.5", className)}
    />
  );
}

export function SettingsPickerCheckBadge({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  var box = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";
  var icon = size === "sm" ? 8 : 11;

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-fg text-bg shadow-[0_1px_3px_color-mix(in_srgb,var(--bg)_35%,transparent)]",
        box,
        className
      )}
      aria-hidden
    >
      <Check size={icon} strokeWidth={3} />
    </span>
  );
}
