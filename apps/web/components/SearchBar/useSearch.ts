"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { mockSearch } from "./mockSearchApi";
import type { SearchResult } from "./types";

// ---------------------------------------------------------------------------
// localStorage helpers for recent searches
// ---------------------------------------------------------------------------

const STORAGE_KEY = "35mm-recent-searches";
const MAX_RECENTS = 5;

function loadRecents(): SearchResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SearchResult[]) : [];
  } catch {
    return [];
  }
}

function persistRecents(items: SearchResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Silently fail if storage is full or unavailable.
  }
}

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export interface UseSearchOptions {
  /** Category hint forwarded to the mock API. */
  category?: "films" | "communities" | "festivals" | "users" | "all";

  /**
   * When `true` the hook skips the built-in mock API and expects the
   * consumer to supply results via the `externalResults` field.
   */
  useExternalResults?: boolean;
}

// ---------------------------------------------------------------------------
// useSearch hook
// ---------------------------------------------------------------------------

export function useSearch(options: UseSearchOptions = {}) {
  const { category, useExternalResults = false } = options;

  // -- Query state ----------------------------------------------------------
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  // -- Dropdown state -------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // -- Recent searches ------------------------------------------------------
  const [recents, setRecents] = useState<SearchResult[]>(loadRecents);

  const addRecent = useCallback((item: SearchResult) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      const next = [item, ...filtered].slice(0, MAX_RECENTS);
      persistRecents(next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((id: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persistRecents(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    persistRecents([]);
  }, []);

  // -- Mock API query (skipped when consumer supplies external results) -----
  const {
    data: mockResults = [],
    isLoading: isMockLoading,
    isError: isMockError,
  } = useQuery<SearchResult[]>({
    queryKey: ["search", debouncedQuery, category],
    queryFn: ({ signal }) =>
      mockSearch({ query: debouncedQuery, category, signal }),
    enabled: !useExternalResults && debouncedQuery.trim().length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // -- Derived values -------------------------------------------------------
  const results = useExternalResults ? [] : mockResults;
  const isLoading = useExternalResults ? false : isMockLoading;
  const isError = useExternalResults ? false : isMockError;

  // Reset active index when results change.
  const prevResultsLenRef = useRef(results.length);
  useEffect(() => {
    if (results.length !== prevResultsLenRef.current) {
      setActiveIndex(-1);
      prevResultsLenRef.current = results.length;
    }
  }, [results.length]);

  // -- Helpers --------------------------------------------------------------
  const reset = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  return {
    // Query
    query,
    setQuery,
    debouncedQuery,

    // Results
    results,
    isLoading,
    isError,

    // Dropdown
    isOpen,
    open,
    close,
    activeIndex,
    setActiveIndex,

    // Recents
    recents,
    addRecent,
    removeRecent,
    clearRecents,

    // Utilities
    reset,
  } as const;
}
