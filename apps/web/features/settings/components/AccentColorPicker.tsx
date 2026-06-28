"use client";

import { cn } from "@/lib/utils/cn";
import {
  ACCENT_COLOR_OPTIONS,
  type AccentColorOption,
} from "@/lib/theme/accentColors";
import {
  settingsPickerCardClass,
  settingsPickerChipClass,
  SettingsPickerCheck,
  SettingsPickerCheckBadge,
} from "./settingsPickerStyles";

type AccentColorPickerProps = {
  value: AccentColorOption;
  onChange: (value: AccentColorOption) => void;
  disabled?: boolean;
  variant?: "settings" | "compact";
};

function ThemeDefaultSwatch({
  className,
  selected,
  compact,
}: {
  className?: string;
  selected?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex items-center justify-center rounded-full",
        "bg-[color-mix(in_srgb,var(--fg)_8%,var(--elevated))]",
        "ring-1 ring-[color-mix(in_srgb,var(--fg)_16%,transparent)] ring-inset",
        className
      )}
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-fg shadow-[0_0_0_1px_color-mix(in_srgb,var(--bg)_65%,transparent)]" />
      {selected && compact ? (
        <SettingsPickerCheckBadge
          size="sm"
          className="absolute inset-0 m-auto"
        />
      ) : null}
    </span>
  );
}

function SolidColorSwatch({
  swatch,
  selected,
  className,
}: {
  swatch: string;
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("relative overflow-hidden rounded-full", className)}
      style={{ background: swatch }}
      aria-hidden
    >
      {selected ? (
        <SettingsPickerCheckBadge
          size="sm"
          className="absolute inset-0 m-auto"
        />
      ) : null}
    </span>
  );
}

function AccentColorSwatch({
  optionId,
  swatch,
  selected,
  size,
}: {
  optionId: AccentColorOption;
  swatch: string;
  selected: boolean;
  size: "compact" | "settings";
}) {
  if (optionId === "theme") {
    return (
      <ThemeDefaultSwatch
        className={size === "compact" ? "absolute inset-[2px]" : "h-8 w-8"}
        selected={selected}
        compact={size === "compact"}
      />
    );
  }

  return (
    <SolidColorSwatch
      swatch={swatch}
      selected={selected && size === "compact"}
      className={size === "compact" ? "absolute inset-[2px]" : "h-8 w-8"}
    />
  );
}

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
                "relative h-7 w-7 rounded-full",
                settingsPickerChipClass(selected),
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
              <AccentColorSwatch
                optionId={option.id}
                swatch={option.swatch}
                selected={selected}
                size="compact"
              />
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
              "relative flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-lg p-2",
              settingsPickerCardClass({ selected, enabled: true }),
              disabled ? "cursor-not-allowed opacity-65" : "cursor-pointer"
            )}
            aria-pressed={selected}
            disabled={disabled}
            onClick={function () {
              if (option.id !== value) onChange(option.id);
            }}
          >
            {selected ? <SettingsPickerCheck /> : null}
            <AccentColorSwatch
              optionId={option.id}
              swatch={option.swatch}
              selected={selected}
              size="settings"
            />
            <span
              className={cn(
                "text-center text-[11px] leading-tight text-fg",
                selected ? "font-semibold" : "font-medium"
              )}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
