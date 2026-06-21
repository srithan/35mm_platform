"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SearchDropdown } from "./SearchDropdown";
import { QUICK_LINKS } from "./searchConstants";
import { useSearch } from "./useSearch";
import type {
  SearchBarProps,
  SearchQuickLink,
  SearchResult,
  SearchTrendingPill,
} from "./types";

const SHORTCUT_KEY = "k";

export function SearchBar({
  placeholder = "Search…",
  onSearch,
  onSelect,
  onNavigate,
  onClear,
  results: externalResults,
  isLoading: externalLoading,
  variant = "default",
  size = "default",
  autoFocus = false,
  className,
  category,
  showDropdown = true,
  showEmptySuggestions = false,
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

  const prevDebouncedRef = useRef(debouncedQuery);
  useEffect(() => {
    if (debouncedQuery !== prevDebouncedRef.current) {
      prevDebouncedRef.current = debouncedQuery;
      onSearch?.(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

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

  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const item = listboxRef.current.querySelector(
      `[id="searchbar-item-${activeIndex}"]`,
    ) as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const trimmedQuery = query.trim();
  const showRecents =
    showDropdown && trimmedQuery.length === 0 && recents.length > 0;
  const showEmptySuggestionsPanel =
    showDropdown &&
    showEmptySuggestions &&
    trimmedQuery.length === 0 &&
    isOpen;
  const showRecentsOnlyPanel =
    showDropdown &&
    !showEmptySuggestions &&
    trimmedQuery.length === 0 &&
    recents.length > 0 &&
    isOpen;
  const showResults = showDropdown && trimmedQuery.length > 0 && isOpen;
  const dropdownVisible =
    showEmptySuggestionsPanel || showRecentsOnlyPanel || showResults;

  const emptyNavItems = useMemo(() => {
    const quickLinkItems: SearchResult[] = QUICK_LINKS.map((link) => ({
      id: link.id,
      label: link.label,
      sublabel: link.sublabel,
      href: link.href,
    }));
    return [...recents, ...quickLinkItems];
  }, [recents]);

  const dropdownItems: SearchResult[] =
    trimmedQuery.length === 0 ? emptyNavItems : results;

  const handleSelect = useCallback(
    (item: SearchResult) => {
      addRecent(item);
      onSelect?.(item);
      if (item.href) {
        onNavigate?.(item.href);
      }
      reset();
    },
    [addRecent, onSelect, onNavigate, reset],
  );

  const handleSelectPill = useCallback(
    (pill: SearchTrendingPill) => {
      setQuery(pill.query);
      open();
      inputRef.current?.focus();
    },
    [setQuery, open],
  );

  const handleSelectQuickLink = useCallback(
    (link: SearchQuickLink) => {
      onNavigate?.(link.href);
      reset();
    },
    [onNavigate, reset],
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
      if (!showDropdown) {
        close();
        return;
      }
      if (value.trim().length > 0 || showEmptySuggestions || recents.length > 0) {
        open();
      } else {
        close();
      }
    },
    [setQuery, open, close, recents.length, showDropdown, showEmptySuggestions],
  );

  const handleFocus = useCallback(() => {
    if (!showDropdown) return;
    if (
      trimmedQuery.length > 0 ||
      showEmptySuggestions ||
      recents.length > 0
    ) {
      open();
    }
  }, [trimmedQuery.length, recents.length, open, showDropdown, showEmptySuggestions]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!dropdownVisible) {
        if (
          e.key === "ArrowDown" &&
          (trimmedQuery.length > 0 ||
            showEmptySuggestions ||
            recents.length > 0)
        ) {
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
            const item = dropdownItems[activeIndex];
            if (trimmedQuery.length === 0 && activeIndex >= recents.length) {
              const link = QUICK_LINKS[activeIndex - recents.length];
              if (link) {
                handleSelectQuickLink(link);
                break;
              }
            }
            handleSelect(item);
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
      handleSelectQuickLink,
      close,
      open,
      trimmedQuery.length,
      recents.length,
      showEmptySuggestions,
    ],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < dropdownItems.length) {
        const item = dropdownItems[activeIndex];
        if (trimmedQuery.length === 0 && activeIndex >= recents.length) {
          const link = QUICK_LINKS[activeIndex - recents.length];
          if (link) {
            handleSelectQuickLink(link);
            return;
          }
        }
        handleSelect(item);
      } else {
        onSearch?.(trimmedQuery);
        close();
      }
    },
    [
      activeIndex,
      dropdownItems,
      handleSelect,
      handleSelectQuickLink,
      onSearch,
      trimmedQuery,
      close,
      recents.length,
    ],
  );

  const activeDescendant =
    activeIndex >= 0 ? `searchbar-item-${activeIndex}` : undefined;

  const isInline = variant === "inline";
  const isCompact = size === "compact";

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative",
        !isInline && !isCompact && "py-3",
        className,
      )}
    >
      <form role="search" onSubmit={handleSubmit} autoComplete="off">
        <div
          className={cn(
            "relative flex items-center rounded-full border border-border bg-sunken-2 transition-all duration-200 focus-within:border-border focus-within:bg-elevated dark:bg-elevated",
            isCompact
              ? "py-1.5 pl-9 pr-3 focus-within:border-border-strong focus-within:shadow-none"
              : "py-3 pl-10 pr-4 focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
          )}
        >
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-muted",
              isCompact ? "left-3 h-3.5 w-3.5" : "left-3.5 h-[18px] w-[18px]",
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
              "min-w-0 flex-1 border-none bg-transparent font-medium text-fg outline-none placeholder:text-fg-faint [&::-webkit-search-cancel-button]:appearance-none",
              isCompact ? "text-sm" : "text-[15px]",
            )}
            style={{ caretColor: "var(--accent)" }}
          />

          {query.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "flex-shrink-0 rounded-full text-fg-muted transition-colors hover:bg-sunken hover:text-fg",
                isCompact ? "mr-0.5 p-0.5" : "mr-1 p-1",
              )}
              aria-label="Clear search"
            >
              <X className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </button>
          ) : null}

          {!isInline && query.length === 0 ? (
            <span className="flex-shrink-0 select-none rounded-md bg-hover px-1.5 py-0.5 text-[12px] tracking-[0.04em] text-fg-muted">
              ⌘K
            </span>
          ) : null}
        </div>
      </form>

      {dropdownVisible ? (
        <SearchDropdown
          listId={listId}
          listboxRef={listboxRef}
          debouncedQuery={debouncedQuery}
          isLoading={isLoading}
          isError={isError}
          showRecents={showRecents}
          showEmptySuggestions={showEmptySuggestionsPanel}
          showRecentsOnly={showRecentsOnlyPanel}
          showResults={showResults}
          recents={recents}
          results={results}
          activeIndex={activeIndex}
          onSelect={handleSelect}
          onSelectPill={handleSelectPill}
          onSelectQuickLink={handleSelectQuickLink}
          onHover={setActiveIndex}
          onClearRecents={clearRecents}
          onRemoveRecent={removeRecent}
        />
      ) : null}
    </div>
  );
}
