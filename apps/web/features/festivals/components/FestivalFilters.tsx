"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { EVENT_TYPES, CATEGORIES, SORT_OPTIONS } from "../data/festivalTypes";
import { cn } from "@/lib/utils/cn";
import {
  sidebarFilterSectionTitle,
  sidebarFilterListWrap,
  sidebarFilterRowBase,
  sidebarFilterToggleRow,
} from "@/components/filters/sidebarFilterStyles";

interface FestivalFiltersProps {
  eventType: string | null;
  onEventTypeChange: (value: string | null) => void;
  categories: string[];
  onCategoryToggle: (cat: string) => void;
  openOnly: boolean;
  onOpenOnlyChange: (v: boolean) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
  /** When true, omit bottom border (e.g. when used inside a combined toolbar row) */
  noBorder?: boolean;
  /** Full-height filter column vs compact toolbar + dropdown */
  variant?: "toolbar" | "sidebar";
}

export function FestivalFilters({
  eventType,
  onEventTypeChange,
  categories,
  onCategoryToggle,
  openOnly,
  onOpenOnlyChange,
  sortBy,
  onSortChange,
  noBorder = false,
  variant = "toolbar",
}: FestivalFiltersProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(
    function () {
      function handleClickOutside(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      }
      if (open) document.addEventListener("mousedown", handleClickOutside);
      return function () {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    },
    [open]
  );

  const hasActiveFilters = !!(eventType || openOnly || categories.length > 0);

  const openOnlyFieldToolbar = (
    <label className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0">
      <span
        className={cn(
          "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors",
          openOnly
            ? "bg-neutral-800 dark:bg-neutral-200 border-neutral-800 dark:border-neutral-200"
            : "border-border bg-elevated group-hover:border-fg-muted"
        )}
      >
        {openOnly ? (
          <Check className="w-2.5 h-2.5 text-white dark:text-neutral-900" strokeWidth={3} />
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={openOnly}
        onChange={function (e) {
          onOpenOnlyChange(e.target.checked);
        }}
        className="sr-only"
      />
      <span className="text-[11px] text-fg">Open for submissions only</span>
    </label>
  );

  const eventTypeFieldToolbar = (
    <div className="flex-shrink-0">
      <p className="text-[11px] font-medium text-fg mb-1.5">Event type</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={function () {
            onEventTypeChange(null);
          }}
          className={cn(
            "text-[11px] px-2.5 py-1.5 rounded-md border transition-colors",
            !eventType
              ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 border-neutral-800 dark:border-neutral-200"
              : "border-border bg-elevated hover:border-fg-muted hover:bg-fg/5"
          )}
        >
          All
        </button>
        {EVENT_TYPES.map(function (t) {
          return (
            <button
              key={t}
              type="button"
              onClick={function () {
                onEventTypeChange(t);
              }}
              className={cn(
                "text-[11px] px-2.5 py-1.5 rounded-md border transition-colors",
                eventType === t
                  ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 border-neutral-800 dark:border-neutral-200"
                  : "border-border bg-elevated hover:border-fg-muted hover:bg-fg/5"
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );

  const categoriesFieldToolbar = (
    <div>
      <p className="text-[11px] font-medium text-fg mb-1.5">Categories</p>
      <div className="flex flex-wrap gap-1.5 max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain pr-1">
        {CATEGORIES.map(function (c) {
          const active = categories.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={function () {
                onCategoryToggle(c);
              }}
              className={cn(
                "flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition-colors",
                active
                  ? "bg-accent/10 text-accent border-accent/40"
                  : "border-border bg-elevated hover:border-fg-muted hover:bg-fg/5"
              )}
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border",
                  active ? "bg-accent border-accent" : "border-border bg-elevated"
                )}
              >
                {active ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /> : null}
              </span>
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );

  const sortSelectToolbar = (
    <select
      value={sortBy}
      onChange={function (e) {
        onSortChange(e.target.value);
      }}
      className="text-[11px] border border-border rounded px-2 py-1 bg-elevated text-fg focus:outline-none focus:border-fg-muted"
    >
      {SORT_OPTIONS.map(function (o) {
        return (
          <option key={o} value={o}>
            {o}
          </option>
        );
      })}
    </select>
  );

  const openOnlySidebar = (
    <div className={cn(sidebarFilterListWrap, "shadow-sm")}>
      <button
        type="button"
        aria-pressed={openOnly}
        onClick={function () {
          onOpenOnlyChange(!openOnly);
        }}
        className={sidebarFilterToggleRow(openOnly)}
      >
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            openOnly
              ? "border-fg bg-fg text-bg"
              : "border-border bg-bg"
          )}
        >
          {openOnly ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
        </span>
        <span className="flex-1 text-left font-medium">Only show open calls</span>
      </button>
    </div>
  );

  const eventTypeSidebar = (
    <div>
      <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Event type</p>
      <div className={cn(sidebarFilterListWrap, "shadow-sm flex flex-col")}>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={function () {
              onEventTypeChange(null);
            }}
            className={sidebarFilterRowBase(!eventType)}
          >
            Everything
          </button>
          {EVENT_TYPES.map(function (t) {
            return (
              <button
                key={t}
                type="button"
                onClick={function () {
                  onEventTypeChange(t);
                }}
                className={sidebarFilterRowBase(eventType === t)}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const categoriesSidebar = (
    <div>
      <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Categories</p>
      <div className={cn(sidebarFilterListWrap, "shadow-sm flex flex-col")}>
        <div className="flex flex-col">
          {CATEGORIES.map(function (c) {
            const active = categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={function () {
                  onCategoryToggle(c);
                }}
                className={sidebarFilterToggleRow(active)}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-bg"
                  )}
                >
                  {active ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </span>
                <span className="flex-1 text-left">{c}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const sortSidebar = (
    <div>
      <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Sort</p>
      <select
        value={sortBy}
        onChange={function (e) {
          onSortChange(e.target.value);
        }}
        className="flex h-11 w-full cursor-pointer rounded-xl border border-border bg-elevated px-3 text-[13px] text-fg shadow-sm focus:outline-none focus:ring-2 focus:ring-fg/10 focus:border-border-strong"
      >
        {SORT_OPTIONS.map(function (o) {
          return (
            <option key={o} value={o}>
              {o}
            </option>
          );
        })}
      </select>
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-5", !noBorder && "border-b border-border pb-5")}>
        {openOnlySidebar}
        {eventTypeSidebar}
        {categoriesSidebar}
        {sortSidebar}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-3 py-2", !noBorder && "border-b border-border")}
      ref={ref}
    >
      <div className="relative">
        <button
          type="button"
          onClick={function () {
            setOpen(!open);
          }}
          className="flex items-center gap-1.5 text-[11px] border border-border rounded px-2 py-1.5 bg-elevated text-fg-muted hover:text-fg focus:outline-none focus:border-fg-muted"
        >
          Filters
          {hasActiveFilters ? (
            <span className="bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px]">
              {[eventType ? 1 : 0, openOnly ? 1 : 0, categories.length].reduce(function (a, b) {
                return a + b;
              }, 0)}
            </span>
          ) : null}
          <ChevronDown
            className={cn("w-3 h-3 transition-transform", open ? "rotate-180" : "")}
            strokeWidth={2}
          />
        </button>
        {open ? (
          <div className="absolute top-full left-0 mt-1 z-20 w-[380px] max-h-[min(70vh,480px)] p-4 bg-elevated border border-border rounded-lg shadow-lg overflow-hidden flex flex-col gap-4">
            {openOnlyFieldToolbar}
            {eventTypeFieldToolbar}
            {categoriesFieldToolbar}
          </div>
        ) : null}
      </div>
      {sortSelectToolbar}
    </div>
  );
}
