"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";
import {
  buildCalendarDays,
  formatDisplayDate,
  getMonthLabel,
  getSelectableBounds,
  getYearOptions,
  isSelectableIsoDate,
  MONTHS,
  parseIsoDate,
  WEEKDAY_LABELS,
} from "./datePickerUtils";

type HeaderMenu = "month" | "year" | null;

const menuTriggerClassName =
  "inline-flex h-8 max-w-full min-w-0 items-center gap-1 rounded-lg border border-border bg-sunken px-2.5 text-[12.5px] font-medium text-fg shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_4%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_5%,var(--sunken))] focus:outline-none focus-visible:ring-2 focus-visible:ring-border";

const menuPanelClassName =
  "absolute left-0 top-[calc(100%+4px)] z-20 max-h-44 w-full min-w-[7.5rem] overflow-y-auto overscroll-contain rounded-xl border border-border bg-elevated py-1 shadow-[0_10px_28px_color-mix(in_srgb,var(--fg)_10%,transparent)]";

interface DatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-invalid"?: boolean;
}

function DatePickerMenu({
  id,
  label,
  valueLabel,
  open,
  onToggle,
  onClose,
  children,
  className,
}: {
  id: string;
  label: string;
  valueLabel: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(
    function closeOnOutsidePointer() {
      if (!open) return;
      function onPointerDown(event: MouseEvent) {
        const target = event.target as Node;
        if (listRef.current?.contains(target)) return;
        onClose();
      }
      document.addEventListener("mousedown", onPointerDown);
      return function () {
        document.removeEventListener("mousedown", onPointerDown);
      };
    },
    [open, onClose]
  );

  return (
    <div ref={listRef} className={cn("relative min-w-0", className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={onToggle}
        className={cn(menuTriggerClassName, open && "ring-2 ring-border")}
      >
        <span className="min-w-0 truncate">{valueLabel}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-fg-muted transition-transform", open && "rotate-180")}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <div role="listbox" aria-label={label} className={menuPanelClassName}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DatePicker({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "Select date",
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const yearOptionRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [open, setOpen] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<HeaderMenu>(null);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const parsed = parseIsoDate(value);
  const initialView = parsed ?? {
    year: getSelectableBounds().maxYear - 25,
    month: 1,
    day: 1,
  };
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);

  const reposition = useCallback(function () {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    setPanelStyle({
      top: rect.bottom + 8,
      left: Math.max(12, left),
      width,
    });
  }, []);

  const isInside = useCallback(function (target: Node) {
    if (triggerRef.current?.contains(target)) return true;
    if (panelRef.current?.contains(target)) return true;
    return false;
  }, []);

  usePopoverLayer({
    open,
    reposition,
    isInside,
    onPointerOutsideDismiss: function () {
      setHeaderMenu(null);
      setOpen(false);
    },
    onEscape: function () {
      if (headerMenu) {
        setHeaderMenu(null);
        return;
      }
      setOpen(false);
    },
  });

  useLayoutEffect(
    function syncViewToValue() {
      if (!open) return;
      const next = parseIsoDate(value);
      if (next) {
        setViewYear(next.year);
        setViewMonth(next.month);
      }
    },
    [open, value]
  );

  useLayoutEffect(
    function scrollSelectedYearIntoView() {
      if (headerMenu !== "year") return;
      const node = yearOptionRefs.current[viewYear];
      node?.scrollIntoView({ block: "nearest" });
    },
    [headerMenu, viewYear]
  );

  function openPicker() {
    if (disabled) return;
    const next = parseIsoDate(value);
    if (next) {
      setViewYear(next.year);
      setViewMonth(next.month);
    }
    setHeaderMenu(null);
    setOpen(true);
  }

  function selectDate(nextValue: string) {
    if (!isSelectableIsoDate(nextValue)) return;
    onChange(nextValue);
    setHeaderMenu(null);
    setOpen(false);
  }

  function clearDate() {
    onChange("");
    setHeaderMenu(null);
    setOpen(false);
  }

  function goToPreviousMonth() {
    setHeaderMenu(null);
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
      return;
    }
    setViewMonth(viewMonth - 1);
  }

  function goToNextMonth() {
    setHeaderMenu(null);
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
      return;
    }
    setViewMonth(viewMonth + 1);
  }

  const displayValue = value ? formatDisplayDate(value) : null;
  const calendarDays = buildCalendarDays(viewYear, viewMonth);
  const bounds = getSelectableBounds();
  const yearOptions = getYearOptions();

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={ariaInvalid ? "" : undefined}
        aria-describedby={open ? listboxId : undefined}
        onClick={openPicker}
        className={cn(
          "edit-profile-input flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left text-[15px] leading-snug shadow-none outline-none",
          "focus:outline-none focus-visible:outline-none",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          displayValue ? "text-fg" : "text-fg-faint"
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-fg-faint" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{displayValue ?? placeholder}</span>
      </button>

      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              id={listboxId}
              role="dialog"
              aria-label="Choose date of birth"
              className="fixed z-[calc(var(--z-modal)+1)] rounded-2xl border border-border bg-elevated shadow-[0_16px_40px_color-mix(in_srgb,var(--fg)_12%,transparent)]"
              style={{
                top: panelStyle.top,
                left: panelStyle.left,
                width: panelStyle.width,
              }}
            >
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 border-b border-border/60 px-3 py-2.5">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={goToPreviousMonth}
                  disabled={viewYear <= bounds.minYear && viewMonth === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-sunken hover:text-fg disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </button>

                <div className="flex items-center justify-center gap-1.5">
                  <DatePickerMenu
                    id={id + "-month"}
                    label="Month"
                    valueLabel={getMonthLabel(viewMonth)}
                    open={headerMenu === "month"}
                    onToggle={function () {
                      setHeaderMenu(function (current) {
                        return current === "month" ? null : "month";
                      });
                    }}
                    onClose={function () {
                      setHeaderMenu(function (current) {
                        return current === "month" ? null : current;
                      });
                    }}
                    className="min-w-[7.75rem]"
                  >
                    {MONTHS.map(function (monthLabel, index) {
                      const monthValue = index + 1;
                      const selected = monthValue === viewMonth;
                      return (
                        <button
                          key={monthLabel}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={function () {
                            setViewMonth(monthValue);
                            setHeaderMenu(null);
                          }}
                          className={cn(
                            "flex w-full px-3 py-2 text-left text-[13px] transition-colors",
                            selected ? "bg-sunken font-semibold text-fg" : "text-fg hover:bg-sunken"
                          )}
                        >
                          {monthLabel}
                        </button>
                      );
                    })}
                  </DatePickerMenu>

                  <DatePickerMenu
                    id={id + "-year"}
                    label="Year"
                    valueLabel={String(viewYear)}
                    open={headerMenu === "year"}
                    onToggle={function () {
                      setHeaderMenu(function (current) {
                        return current === "year" ? null : "year";
                      });
                    }}
                    onClose={function () {
                      setHeaderMenu(function (current) {
                        return current === "year" ? null : current;
                      });
                    }}
                    className="w-[5.75rem] shrink-0"
                  >
                    {yearOptions.map(function (year) {
                      const selected = year === viewYear;
                      return (
                        <button
                          key={year}
                          ref={function (node) {
                            yearOptionRefs.current[year] = node;
                          }}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={function () {
                            setViewYear(year);
                            setHeaderMenu(null);
                          }}
                          className={cn(
                            "flex w-full px-3 py-2 text-left text-[13px] tabular-nums transition-colors",
                            selected ? "bg-sunken font-semibold text-fg" : "text-fg hover:bg-sunken"
                          )}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </DatePickerMenu>
                </div>

                <button
                  type="button"
                  aria-label="Next month"
                  onClick={goToNextMonth}
                  disabled={viewYear >= bounds.maxYear && viewMonth === 12}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-sunken hover:text-fg disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 px-3 pt-2">
                {WEEKDAY_LABELS.map(function (label) {
                  return (
                    <div
                      key={label}
                      className="pb-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-fg-faint"
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 gap-1 px-3 pb-3">
                {calendarDays.map(function (cell, index) {
                  if (!cell.inMonth || !cell.isoDate) {
                    return (
                      <div
                        key={"pad-" + index}
                        className="flex h-9 items-center justify-center text-[13px] text-fg-faint/40"
                        aria-hidden
                      >
                        {cell.day}
                      </div>
                    );
                  }

                  const selected = value === cell.isoDate;
                  const selectable = isSelectableIsoDate(cell.isoDate);

                  return (
                    <button
                      key={cell.isoDate}
                      type="button"
                      disabled={!selectable}
                      aria-label={formatDisplayDate(cell.isoDate) ?? cell.isoDate}
                      aria-pressed={selected}
                      onClick={function () {
                        selectDate(cell.isoDate as string);
                      }}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors",
                        selected
                          ? "bg-accent text-[color:var(--bg)]"
                          : selectable
                            ? "text-fg hover:bg-sunken"
                            : "cursor-not-allowed text-fg-faint/35",
                        cell.isToday && !selected && "ring-1 ring-border"
                      )}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-border/60 px-3 py-2.5">
                <button
                  type="button"
                  onClick={clearDate}
                  className="text-[12px] font-medium text-fg-muted transition-colors hover:text-fg"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setHeaderMenu(null);
                    setOpen(false);
                  }}
                  className="text-[12px] font-medium text-accent transition-opacity hover:opacity-80"
                >
                  Done
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
