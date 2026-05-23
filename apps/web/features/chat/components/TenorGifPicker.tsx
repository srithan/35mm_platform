"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TenorResult {
  id: string;
  previewUrl: string;
  sendUrl: string;
}

interface TenorGifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
}

function parseTenorResults(raw: unknown): TenorResult[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const results = (raw as { results?: unknown[] }).results;
  if (!Array.isArray(results)) {
    return [];
  }
  const out: TenorResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const item = results[i] as {
      id?: string;
      media_formats?: Record<
        string,
        { url?: string; dims?: number[] } | undefined
      >;
    };
    const id = String(item.id || i);
    const tiny = item.media_formats?.tinygif?.url;
    const full = item.media_formats?.gif?.url || tiny;
    const prev = tiny || full;
    if (full && prev) {
      out.push({ id: id, previewUrl: prev, sendUrl: full });
    }
  }
  return out;
}

export function TenorGifPicker({
  isOpen,
  onClose,
  onSelect,
  anchorRef,
  align = "left",
}: TenorGifPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TenorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_TENOR_API_KEY || ""
      : "";

  const fetchGifs = useCallback(
    function (q: string) {
      if (!apiKey) {
        setError("Add NEXT_PUBLIC_TENOR_API_KEY to use GIF search.");
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const term = q.trim();
      const base =
        "https://tenor.googleapis.com/v2/" +
        (term ? "search?q=" + encodeURIComponent(term) + "&" : "featured?") +
        "key=" +
        encodeURIComponent(apiKey) +
        "&client_key=35mm_chat&limit=20&media_filter=tinygif,gif";
      fetch(base)
        .then(function (res) {
          if (!res.ok) {
            throw new Error("Tenor request failed");
          }
          return res.json();
        })
        .then(function (data) {
          setResults(parseTenorResults(data));
        })
        .catch(function () {
          setError("Couldn’t load GIFs.");
          setResults([]);
        })
        .finally(function () {
          setLoading(false);
        });
    },
    [apiKey]
  );

  useEffect(
    function () {
      if (!isOpen) {
        return;
      }
      const t = window.setTimeout(function () {
        fetchGifs(query);
      }, 320);
      return function () {
        window.clearTimeout(t);
      };
    },
    [isOpen, fetchGifs, query]
  );

  useEffect(
    function () {
      if (!isOpen) {
        return;
      }
      function onPointerDown(e: PointerEvent) {
        const target = e.target as Node | null;
        if (!target) {
          return;
        }
        if (panelRef.current && panelRef.current.contains(target)) {
          return;
        }
        if (anchorRef.current && anchorRef.current.contains(target)) {
          return;
        }
        onClose();
      }
      document.addEventListener("pointerdown", onPointerDown);
      return function () {
        document.removeEventListener("pointerdown", onPointerDown);
      };
    },
    [isOpen, onClose, anchorRef]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute z-[80] w-[min(100vw-20px,360px)] max-h-[min(70vh,420px)] flex flex-col rounded-2xl border border-border bg-elevated/95 backdrop-blur-md shadow-xl overflow-hidden",
        "bottom-full mb-2",
        align === "right" ? "right-0" : "left-0"
      )}
      style={{
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <div className="p-2 border-b border-border flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 rounded-xl bg-sunken px-2.5 py-1.5">
          <Search className="w-4 h-4 text-fg-muted shrink-0" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={function (e) {
              setQuery(e.target.value);
            }}
            placeholder="Search Tenor…"
            className="flex-1 min-w-0 bg-transparent text-[16px] text-fg placeholder:text-fg-muted focus:outline-none"
            aria-label="Search GIFs"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {error ? (
          <p className="text-[13px] text-fg-muted text-center py-8 px-3 leading-relaxed">
            {error}
          </p>
        ) : loading && results.length === 0 ? (
          <p className="text-[13px] text-fg-muted text-center py-8">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {results.map(function (g) {
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={function () {
                    onSelect(g.sendUrl);
                    onClose();
                  }}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden bg-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
