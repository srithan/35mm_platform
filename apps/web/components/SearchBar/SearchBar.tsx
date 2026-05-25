"use client";

import {
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import { Search, X, Clock, Loader2, Film, User, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/EmptyState";
import { useSearch } from "./useSearch";
import type { SearchBarProps, SearchResult } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHORTCUT_KEY = "k";

// ---------------------------------------------------------------------------
// SearchBar component
// ---------------------------------------------------------------------------

export function SearchBar({
  placeholder = "Search…",
  onSearch,
  onSelect,
  onClear,
  results: externalResults,
  isLoading: externalLoading,
  variant = "default",
  size = "default",
  autoFocus = false,
  className,
  category,
  showDropdown = true,
}: SearchBarProps) {
  const useExternalResults = externalResults !== undefined;

  const {
    query,
    setQuery,
    debouncedQuery,
    results: internalResults,
    isLoading: internalLoading,
    isError,
    isOpen,
    open,
    close,
    activeIndex,
    setActiveIndex,
    recents,
    addRecent,
    removeRecent,
    clearRecents,
    reset,
  } = useSearch({ category, useExternalResults });

  const results = useExternalResults ? externalResults : internalResults;
  const isLoading = useExternalResults
    ? (externalLoading ?? false)
    : internalLoading;

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const listId = "searchbar-listbox";

  // Notify parent when debounced query changes.
  const prevDebouncedRef = useRef(debouncedQuery);
  useEffect(() => {
    if (debouncedQuery !== prevDebouncedRef.current) {
      prevDebouncedRef.current = debouncedQuery;
      onSearch?.(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  // Auto-focus.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // ⌘K / Ctrl+K global shortcut.
  useEffect(() => {
    function handler(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === SHORTCUT_KEY) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Click outside → close dropdown.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  // Scroll active item into view.
  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const item = listboxRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // -- Composite list of dropdown items -------------------------------------
  // When query is empty and we have recents, show recents. Otherwise results.
  const trimmedQuery = query.trim();
  const showRecents = showDropdown && trimmedQuery.length === 0 && recents.length > 0;
  const showResults = showDropdown && trimmedQuery.length > 0;
  const dropdownVisible = isOpen && (showRecents || showResults);

  const dropdownItems: SearchResult[] = showRecents ? recents : results;

  // -- Handlers -------------------------------------------------------------
  const handleSelect = useCallback(
    (item: SearchResult) => {
      addRecent(item);
      onSelect?.(item);
      reset();
    },
    [addRecent, onSelect, reset],
  );

  const handleClear = useCallback(() => {
    reset();
    onClear?.();
    onSearch?.("");
    inputRef.current?.focus();
  }, [reset, onClear, onSearch]);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim().length > 0 || recents.length > 0) {
        open();
      } else {
        close();
      }
    },
    [setQuery, open, close, recents.length],
  );

  const handleFocus = useCallback(() => {
    if (trimmedQuery.length > 0 || recents.length > 0) {
      open();
    }
  }, [trimmedQuery.length, recents.length, open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!dropdownVisible) {
        if (e.key === "ArrowDown" && (trimmedQuery.length > 0 || recents.length > 0)) {
          e.preventDefault();
          open();
        }
        return;
      }

      const itemCount = dropdownItems.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < itemCount - 1 ? prev + 1 : 0,
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : itemCount - 1,
          );
          break;

        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < itemCount) {
            handleSelect(dropdownItems[activeIndex]);
          }
          break;

        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [
      dropdownVisible,
      dropdownItems,
      activeIndex,
      setActiveIndex,
      handleSelect,
      close,
      open,
      trimmedQuery.length,
      recents.length,
    ],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // If an item is highlighted, select it. Otherwise fire onSearch.
      if (activeIndex >= 0 && activeIndex < dropdownItems.length) {
        handleSelect(dropdownItems[activeIndex]);
      } else {
        onSearch?.(trimmedQuery);
        close();
      }
    },
    [activeIndex, dropdownItems, handleSelect, onSearch, trimmedQuery, close],
  );

  // -- Active descendant ID for ARIA ----------------------------------------
  const activeDescendant =
    activeIndex >= 0 ? `searchbar-item-${activeIndex}` : undefined;

  // -- Variant styles -------------------------------------------------------
  const isInline = variant === "inline";
  const isCompact = size === "compact";

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative",
        !isInline && !isCompact && "py-3",
        className
      )}
    >
      <form role="search" onSubmit={handleSubmit} autoComplete="off">
        <div
          className={cn(
            "relative flex items-center rounded-full border border-border bg-sunken-2 dark:bg-elevated transition-all duration-200 focus-within:border-border focus-within:bg-elevated",
            isCompact
              ? "pl-9 pr-3 py-1.5 focus-within:border-border-strong focus-within:shadow-none"
              : "pl-10 pr-4 py-3 focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          )}
        >
          {/* Search icon — absolutely positioned */}
          <Search
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none",
              isCompact ? "left-3 w-3.5 h-3.5" : "left-3.5 w-[18px] h-[18px]"
            )}
            aria-hidden
          />

          <input
            ref={inputRef}
            id="searchbar-input"
            type="search"
            role="combobox"
            aria-expanded={dropdownVisible}
            aria-controls={listId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            aria-label={placeholder}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "flex-1 min-w-0 border-none outline-none bg-transparent font-medium text-fg placeholder:text-fg-faint [&::-webkit-search-cancel-button]:appearance-none",
              isCompact ? "text-sm" : "text-[15px]"
            )}
            style={{ caretColor: "var(--accent)" }}
          />

          {/* Clear button — shown when there's text */}
          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "flex-shrink-0 rounded-full text-fg-muted hover:text-fg hover:bg-sunken transition-colors",
                isCompact ? "p-0.5 mr-0.5" : "p-1 mr-1"
              )}
              aria-label="Clear search"
            >
              <X className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </button>
          )}

          {/* Keyboard shortcut badge — shown in default variant when input is empty */}
          {!isInline && query.length === 0 && (
            <span className="text-[12px] text-fg-muted tracking-[0.04em] flex-shrink-0 select-none bg-hover px-1.5 py-0.5 rounded-md">
              ⌘K
            </span>
          )}
        </div>
      </form>

      {/* ----- Dropdown ----- */}
      {dropdownVisible && (
        <div
          className={cn(
            "absolute left-0 right-0 z-[100] mt-2 bg-elevated border border-border rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden"
          )}
          style={isInline ? { marginLeft: 0, marginRight: 0 } : undefined}
        >
          <ul
            id={listId}
            ref={listboxRef}
            role="listbox"
            aria-label="Search results"
            className="max-h-72 overflow-y-auto"
          >
            {/* --- Recent Searches Section --- */}
            {showRecents && (
              <>
                <li
                  role="presentation"
                  className="flex items-center justify-between px-3 pt-2.5 pb-1.5"
                >
                  <span className="text-[10px] tracking-[0.08em] uppercase text-fg-muted ">
                    Recent
                  </span>
                  <button
                    type="button"
                    onClick={clearRecents}
                    className="text-[10px] text-fg-muted hover:text-fg transition-colors "
                  >
                    Clear all
                  </button>
                </li>
                {recents.map((item, index) => (
                  <li
                    key={item.id}
                    id={`searchbar-item-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors group",
                      index === activeIndex
                        ? "bg-sunken"
                        : "hover:bg-sunken",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur
                      handleSelect(item);
                    }}
                  >
                    <Clock
                      className="w-3.5 h-3.5 text-fg-muted flex-shrink-0"
                      aria-hidden
                    />
                    <span className="flex-1 min-w-0 text-[13px] text-fg truncate">
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span className="text-[11px] text-fg-muted truncate max-w-[40%]">
                        {item.sublabel}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm text-fg-muted hover:text-fg transition-all"
                      aria-label={`Remove ${item.label} from recent searches`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </>
            )}

            {/* --- Loading indicator --- */}
            {showResults && isLoading && (
              <li
                role="presentation"
                className="flex items-center gap-2 px-3 py-3.5 text-[12px] text-fg-muted"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching…
              </li>
            )}

            {/* --- Error state --- */}
            {showResults && !isLoading && isError && (
              <li
                role="presentation"
                className="px-3 py-3.5 text-[12px] text-red-500"
              >
                Something went wrong. Please try again.
              </li>
            )}

            {/* --- Empty state --- */}
            {showResults &&
              !isLoading &&
              !isError &&
              debouncedQuery.trim().length > 0 &&
              results.length === 0 && (
                <li
                  role="presentation"
                  className="px-3 py-2"
                >
                  <EmptyState
                    size="sm"
                    icon={<span className="text-[18px]">🔎</span>}
                    headline={`No results for "${debouncedQuery}"`}
                    subline="Try a different search or browse the discover page"
                    primaryCta={{ label: "Browse discover", href: "/discover" }}
                    className="py-4"
                  />
                </li>
              )}

            {/* --- Result items --- */}
            {showResults &&
              !isLoading &&
              !isError &&
              results.map((item, index) => {
                const itemIndex = showRecents
                  ? recents.length + index
                  : index;

                return (
                  <li
                    key={item.id}
                    id={`searchbar-item-${itemIndex}`}
                    role="option"
                    aria-selected={itemIndex === activeIndex}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                      itemIndex === activeIndex
                        ? "bg-sunken"
                        : "hover:bg-sunken",
                    )}
                    onMouseEnter={() => setActiveIndex(itemIndex)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                  >
                    {item.type === "film" ? (
                      <div className="w-8 h-11 flex-shrink-0 bg-hover border border-border rounded-sm overflow-hidden flex items-center justify-center text-fg-faint">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            width={32}
                            height={44}
                            className="w-full h-full object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <Film className="w-4 h-4" />
                        )}
                      </div>
                    ) : item.type === "user" ? (
                      <div className="w-8 h-8 flex-shrink-0 bg-hover border border-border rounded-full flex items-center justify-center overflow-hidden text-[11px] font-medium">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                            sizes="32px"
                          />
                        ) : (
                          item.initial || <User className="w-4 h-4" />
                        )}
                      </div>
                    ) : item.type === "community" ? (
                      <div className="w-8 h-8 flex-shrink-0 bg-hover border border-border rounded-lg flex items-center justify-center text-fg-muted">
                        <Users className="w-4 h-4" />
                      </div>
                    ) : item.icon ? (
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">{item.icon}</span>
                    ) : (
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                        <Search
                          className="w-4 h-4 text-fg-muted"
                          aria-hidden
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-[13px] font-medium text-fg leading-snug truncate">
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div className="text-[11px] text-fg-muted mt-0.5 truncate">
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
