"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  ACCENT_COLOR_OPTIONS,
  type AccentColorOption,
} from "@/lib/theme/accentColors";

type AccentColorPickerProps = {
  value: AccentColorOption;
  onChange: (value: AccentColorOption) => void;
  disabled?: boolean;
  variant?: "settings" | "compact";
};

export function AccentColorPicker({
  value,
  onChange,
  disabled = false,
  variant = "settings",
}: AccentColorPickerProps) {
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Accent color">
        {ACCENT_COLOR_OPTIONS.map(function (option) {
          var selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={cn(
                "relative h-7 w-7 rounded-full border-2 transition-all",
                selected ? "border-accent scale-105" : "border-border hover:border-fg-muted",
                disabled ? "cursor-not-allowed opacity-65" : "cursor-pointer"
              )}
              aria-label={option.label}
              aria-pressed={selected}
              disabled={disabled}
              title={option.label}
              onClick={function () {
                if (option.id !== value) onChange(option.id);
              }}
            >
              <span
                className="absolute inset-[2px] rounded-full border border-black/10"
                style={{ background: option.swatch }}
                aria-hidden
              />
              {selected ? (
                <Check
                  className="absolute inset-0 m-auto text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                  size={12}
                  strokeWidth={3}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-4" role="group" aria-label="Accent color">
      {ACCENT_COLOR_OPTIONS.map(function (option) {
        var selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={cn(
              "relative flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-lg border-2 p-2 transition-all",
              selected ? "border-accent bg-accent/5" : "border-border bg-elevated",
              disabled ? "cursor-not-allowed opacity-65" : "cursor-pointer hover:border-fg-muted"
            )}
            aria-pressed={selected}
            disabled={disabled}
            onClick={function () {
              if (option.id !== value) onChange(option.id);
            }}
          >
            <span
              className="relative h-8 w-8 rounded-full border border-black/10 shadow-sm"
              style={{ background: option.swatch }}
              aria-hidden
            >
              {selected ? (
                <Check
                  className="absolute inset-0 m-auto text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                  size={14}
                  strokeWidth={3}
                  aria-hidden
                />
              ) : null}
            </span>
            <span className="text-center text-[11px] font-medium leading-tight text-fg">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
