"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Search } from "lucide-react";
import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZE } from "@/lib/tmdb/constants";
import type { FilmResult } from "./types";

interface FilmSearchProps {
  onSelect: (film: FilmResult) => void;
  isHidden: boolean;
  autoFocus?: boolean;
}

interface TmdbMovieResult {
  id: number;
  title: string;
  release_date?: string;
  original_language?: string;
  genre_ids?: number[];
  poster_path?: string | null;
}

interface TmdbMovieSearchResponse {
  results?: TmdbMovieResult[];
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

function languageLabel(code: string | undefined): string {
  if (!code) return "Unknown";
  const normalized = code.toLowerCase();
  try {
    const display = new Intl.DisplayNames(["en"], { type: "language" });
    return display.of(normalized) ?? normalized.toUpperCase();
  } catch {
    return normalized.toUpperCase();
  }
}

function genreLabels(ids: number[] | undefined): string[] {
  if (!ids || ids.length === 0) return ["Uncategorized"];
  return ids.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean);
}

export function FilmSearch({ onSelect, isHidden, autoFocus = false }: FilmSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<FilmResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      var target = e.target as Node;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || query.trim().length === 0) return;

    const updatePanelPosition = () => {
      const anchor = wrapperRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(260, openUpward ? spaceAbove : spaceBelow));
      const top = openUpward ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4;

      setPanelStyle({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (isHidden) return;
    if (!autoFocus) return;

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [isHidden, autoFocus]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length === 0) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setIsOpen(true);

      try {
        const url = `/api/tmdb/search/movie?query=${encodeURIComponent(normalizedQuery)}&include_adult=false&page=1`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("Failed to fetch films");
        }

        const data = (await response.json()) as TmdbMovieSearchResponse;
        const mapped: FilmResult[] = (data.results ?? []).slice(0, 10).map((movie) => ({
          id: movie.id,
          title: movie.title,
          year: movie.release_date?.slice(0, 4) ?? "",
          language: languageLabel(movie.original_language),
          genres: genreLabels(movie.genre_ids),
          posterPath: movie.poster_path ?? null,
        }));

        setResults(mapped);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(err instanceof Error ? err.message : "Failed to fetch films");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = useCallback(
    (film: FilmResult) => {
      onSelect(film);
      setQuery("");
      setIsOpen(false);
    },
    [onSelect]
  );

  if (isHidden) return null;

  const getPosterUrl = (posterPath: string | null): string | null => {
    if (!posterPath) return null;
    return `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZE}${posterPath}`;
  };

  const shouldShowResults = isOpen && query.trim().length > 0;
  const resultPanel = shouldShowResults && panelStyle
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed mt-0.5 bg-[var(--composer-bg)] border border-[var(--composer-border)] rounded-md shadow-lg z-[22050] overflow-y-auto"
          style={{
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
            maxHeight: panelStyle.maxHeight,
          }}
        >
          {isLoading && (
            <div className="px-3 py-3 text-[12px] text-fg-muted">Searching TMDB...</div>
          )}
          {!isLoading && error && (
            <div className="px-3 py-3 text-[12px] text-film-red">{error}</div>
          )}
          {!isLoading && !error && results.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-fg-muted">No films found.</div>
          )}
          {!isLoading &&
            !error &&
            results.map((film) => (
              <button
                key={film.id}
                type="button"
                onClick={() => handleSelect(film)}
                className="film-option w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-sunken transition-colors"
              >
                {getPosterUrl(film.posterPath) ? (
                  <div className="w-8 h-11 rounded-sm overflow-hidden flex-shrink-0">
                    <Image
                      src={getPosterUrl(film.posterPath)!}
                      alt={`${film.title} poster`}
                      width={32}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-11 bg-fg rounded-sm flex-shrink-0 flex items-center justify-center">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="rgba(255,255,255,0.2)"
                    >
                      <rect x="2" y="2" width="12" height="12" rx="1" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="text-[13px] font-medium text-fg leading-snug">
                    {film.title}
                  </div>
                  <div className="text-[11px] text-fg-muted mt-0.5">
                    {film.language}
                    {film.genres[0] ? ` · ${film.genres[0]}` : ""}
                    {film.year ? ` · ${film.year}` : ""}
                  </div>
                </div>
              </button>
            ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapperRef} className="relative mb-3">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--composer-border)] bg-[var(--composer-field-bg)] px-3.5 py-2.5 transition-[border-color,background-color,box-shadow] duration-150 focus-within:border-fg-muted/50 focus-within:bg-[var(--composer-bg)] focus-within:shadow-sm">
        <Search
          className="h-3.5 w-3.5 shrink-0 text-fg-faint"
          strokeWidth={1.6}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.trim().length === 0) {
              setIsOpen(false);
            }
          }}
          onFocus={() => {
            if (query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search for a film…"
          aria-label="Search for a film"
          className="flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-faint"
        />
      </div>
      {resultPanel}
    </div>
  );
}
