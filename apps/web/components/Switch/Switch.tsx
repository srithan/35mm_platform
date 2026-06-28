"use client";

import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  className,
  id,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <label
      className={cn(
        "relative h-[17px] w-[30px] flex-shrink-0",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={function (e) {
          onChange?.(e.target.checked);
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-[17px] border transition-colors",
          "border-[var(--switch-track-off-border)] bg-[var(--switch-track-off)]",
          "peer-checked:border-[var(--switch-track-on)] peer-checked:bg-[var(--switch-track-on)]",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-fg/20 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute left-[2.5px] top-[2.5px] h-3 w-3 rounded-full border shadow-sm transition-transform",
          "border-[var(--switch-thumb-off-border)] bg-[var(--switch-thumb-off)]",
          "peer-checked:translate-x-[13px] peer-checked:border-transparent peer-checked:bg-[var(--switch-thumb-on)]"
        )}
      />
    </label>
  );
}
