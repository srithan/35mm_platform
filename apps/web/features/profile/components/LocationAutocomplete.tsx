"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";
import type { PlaceSuggestion } from "@/lib/places/formatLocation";

interface LocationAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-invalid"?: boolean;
}

export function LocationAutocomplete({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "Los Angeles, CA",
  "aria-invalid": ariaInvalid,
}: LocationAutocompleteProps) {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(
    function syncExternalValue() {
      setQuery(value);
    },
    [value]
  );

  const reposition = useCallback(function () {
    const anchor = wrapperRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPanelStyle({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const isInside = useCallback(function (target: Node) {
    if (wrapperRef.current?.contains(target)) return true;
    if (panelRef.current?.contains(target)) return true;
    return false;
  }, []);

  usePopoverLayer({
    open,
    reposition,
    isInside,
    onPointerOutsideDismiss: function () {
      setOpen(false);
      setActiveIndex(-1);
    },
    onEscape: function () {
      setOpen(false);
      setActiveIndex(-1);
    },
  });

  useLayoutEffect(
    function () {
      if (open) reposition();
    },
    [open, reposition]
  );

  useEffect(
    function fetchSuggestions() {
      const trimmed = debouncedQuery.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      let cancelled = false;
      setIsLoading(true);

      fetch("/api/places/autocomplete?q=" + encodeURIComponent(trimmed))
        .then(function (res) {
          if (!res.ok) throw new Error("Location search failed");
          return res.json();
        })
        .then(function (data: { results?: PlaceSuggestion[] }) {
          if (cancelled) return;
          setResults(Array.isArray(data.results) ? data.results : []);
          setActiveIndex(-1);
        })
        .catch(function () {
          if (cancelled) return;
          setResults([]);
        })
        .finally(function () {
          if (!cancelled) setIsLoading(false);
        });

      return function () {
        cancelled = true;
      };
    },
    [debouncedQuery]
  );

  function selectSuggestion(suggestion: PlaceSuggestion) {
    setQuery(suggestion.value);
    onChange(suggestion.value);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(nextValue: string) {
    setQuery(nextValue);
    onChange(nextValue);
    setOpen(nextValue.trim().length >= 2);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(function (current) {
        return current >= results.length - 1 ? 0 : current + 1;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(function (current) {
        return current <= 0 ? results.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(results[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={showPanel ? listboxId : undefined}
        aria-expanded={showPanel}
        aria-invalid={ariaInvalid}
        role="combobox"
        placeholder={placeholder}
        onChange={function (event) {
          handleInputChange(event.target.value);
        }}
        onFocus={function () {
          if (query.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "edit-profile-input w-full border-0 bg-transparent p-0 text-[15px] leading-snug text-fg shadow-none outline-none ring-0 placeholder:text-fg-faint",
          "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
          disabled && "cursor-not-allowed opacity-60"
        )}
      />

      {showPanel && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              id={listboxId}
              role="listbox"
              className="fixed z-[calc(var(--z-modal)+1)] overflow-hidden rounded-2xl border border-border bg-elevated shadow-[0_16px_40px_color-mix(in_srgb,var(--fg)_12%,transparent)]"
              style={{
                top: panelStyle.top,
                left: panelStyle.left,
                width: panelStyle.width,
              }}
            >
              {isLoading ? (
                <div className="px-4 py-3 text-[13px] text-fg-muted">Searching…</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-[13px] text-fg-muted">
                  No places found. Try city, state, or country.
                </div>
              ) : (
                <ul className="max-h-56 overflow-y-auto py-1">
                  {results.map(function (result, index) {
                    const active = index === activeIndex;
                    const countryHint =
                      result.label.length > result.value.length
                        ? result.label.slice(result.value.length).replace(/^ · /, "")
                        : null;
                    return (
                      <li key={result.id + "-" + index} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseDown={function (event) {
                            event.preventDefault();
                          }}
                          onClick={function () {
                            selectSuggestion(result);
                          }}
                          className={cn(
                            "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors",
                            active ? "bg-sunken" : "hover:bg-sunken"
                          )}
                        >
                          <span className="text-[14px] text-fg">{result.value}</span>
                          {countryHint ? (
                            <span className="text-[12px] text-fg-muted">{countryHint}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
