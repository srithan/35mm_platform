"use client";

import type { NsfwCategory } from "@35mm/types";
import { ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: NsfwCategory;
  label: string;
}> = [
  { value: "nudity", label: "Nudity" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "violence", label: "Violence" },
  { value: "graphic_content", label: "Graphic content" },
  { value: "sensitive", label: "Sensitive" },
];

interface ContentWarningControlsProps {
  selected: NsfwCategory[];
  detected: NsfwCategory[];
  isImageScanPending?: boolean;
  onChange: (categories: NsfwCategory[]) => void;
  onDismiss: () => void;
}

export function ContentWarningControls({
  selected,
  detected,
  isImageScanPending = false,
  onChange,
  onDismiss,
}: ContentWarningControlsProps) {
  const hasHint = detected.length > 0;

  function toggleCategory(category: NsfwCategory) {
    if (selected.includes(category)) {
      onChange(
        selected.filter(function (value) {
          return value !== category;
        })
      );
      return;
    }
    onChange([...selected, category]);
  }

  function applyDetectedCategories() {
    const categories = detected.length > 0 ? detected : (["sensitive"] as NsfwCategory[]);
    onChange(Array.from(new Set([...selected, ...categories])));
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-[color-mix(in_srgb,var(--sunken)_58%,var(--elevated))]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-fg">Content warning</p>
          <p className="truncate text-[11px] text-fg-muted">
            {isImageScanPending
              ? "Checking selected images on this device…"
              : "Choose anything viewers should reveal first"}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg"
          aria-label="Close content warning"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {hasHint ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 border-b border-border bg-[color-mix(in_srgb,var(--fg)_4%,var(--elevated))] px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-fg-muted" strokeWidth={1.8} />
            <p className="truncate text-[11.5px] text-fg">
              This may contain sensitive content — you can still post
            </p>
          </div>
          <button
            type="button"
            onClick={applyDetectedCategories}
            className="shrink-0 rounded-full border border-border-strong px-2.5 py-1 text-[10.5px] font-semibold text-fg transition-colors hover:bg-hover"
          >
            Apply
          </button>
        </div>
      ) : null}

      <fieldset className="px-3 py-2.5">
        <legend className="sr-only">Sensitive content categories</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map(function (option) {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1.5 text-[11.5px] transition-colors",
                  checked
                    ? "border-border-strong bg-fg font-semibold text-bg"
                    : "border-border bg-elevated text-fg-muted hover:border-border-strong hover:text-fg"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={function () {
                    toggleCategory(option.value);
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
