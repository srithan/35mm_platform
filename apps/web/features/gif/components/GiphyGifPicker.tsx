"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SyntheticEvent,
} from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { Search } from "lucide-react";
import { BodyPortal } from "@/components/BodyPortal/BodyPortal";
import { usePopoverLayer } from "@/lib/hooks/usePopoverLayer";
import { useDebounce } from "@/lib/hooks/useDebounce";

export interface GiphyGifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
  apiKey?: string;
}

const PANEL_MAX_WIDTH_PX = 360;
const PANEL_MAX_HEIGHT_PX = 440;
const PANEL_MARGIN_PX = 10;
const PANEL_TRIGGER_GAP_PX = 8;

interface PanelPosition {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
}

type GiphyGif = Awaited<ReturnType<GiphyFetch["trending"]>>["data"][number];
type GiphyGridProps = {
  width: number;
  columns: number;
  gutter: number;
  fetchGifs: (offset: number) => ReturnType<GiphyFetch["trending"]>;
  noLink: boolean;
  borderRadius: number;
  noResultsMessage: string;
  onGifsFetchError: () => void;
  onGifClick: (gif: GiphyGif, event: SyntheticEvent<HTMLElement>) => void;
};
const GiphyGrid = Grid as unknown as ComponentType<GiphyGridProps>;

export function GiphyGifPicker({
  isOpen,
  onClose,
  onSelect,
  anchorRef,
  align = "left",
  apiKey: surfaceApiKey,
}: GiphyGifPickerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PanelPosition>({
    top: 0,
    left: 0,
    maxHeight: PANEL_MAX_HEIGHT_PX,
  });
  const [isPositioned, setIsPositioned] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_MAX_WIDTH_PX);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const apiKey = surfaceApiKey?.trim() || process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim() || "";
  const giphy = useMemo(
    function () {
      return apiKey
        ? new GiphyFetch(apiKey, { bundle: "messaging_non_clips" })
        : null;
    },
    [apiKey]
  );

  const normalizedQuery = useDebounce(query.trim().slice(0, 50), 320);
  const fetchGifs = useCallback(
    async function (offset: number) {
      if (!giphy) throw new Error("GIPHY is not configured");

      const options = {
        limit: 20,
        offset,
        rating: "pg-13" as const,
      };

      return normalizedQuery.length > 0
        ? giphy.search(normalizedQuery, options)
        : giphy.trending(options);
    },
    [giphy, normalizedQuery]
  );

  const reposition = useCallback(
    function () {
      const trigger = anchorRef.current;
      if (!trigger) return;

      const viewportWidth = window.innerWidth;
      const nextPanelWidth = Math.min(
        PANEL_MAX_WIDTH_PX,
        Math.max(280, viewportWidth - PANEL_MARGIN_PX * 2)
      );
      const triggerRect = trigger.getBoundingClientRect();
      const spaceAbove = triggerRect.top - PANEL_MARGIN_PX - PANEL_TRIGGER_GAP_PX;
      const spaceBelow =
        window.innerHeight - triggerRect.bottom - PANEL_MARGIN_PX - PANEL_TRIGGER_GAP_PX;
      const preferAbove = spaceAbove >= spaceBelow;
      const availableHeight = Math.max(120, preferAbove ? spaceAbove : spaceBelow);
      let left = align === "right"
        ? triggerRect.right - nextPanelWidth
        : triggerRect.left;

      left = Math.max(
        PANEL_MARGIN_PX,
        Math.min(left, viewportWidth - nextPanelWidth - PANEL_MARGIN_PX)
      );
      setPanelWidth(nextPanelWidth);
      setPosition({
        left,
        maxHeight: Math.min(PANEL_MAX_HEIGHT_PX, availableHeight),
        ...(preferAbove
          ? { bottom: window.innerHeight - triggerRect.top + PANEL_TRIGGER_GAP_PX }
          : { top: triggerRect.bottom + PANEL_TRIGGER_GAP_PX }),
      });
      setIsPositioned(true);
    },
    [align, anchorRef]
  );

  const scheduleReposition = useCallback(
    function () {
      reposition();
      window.requestAnimationFrame(reposition);
    },
    [reposition]
  );

  const setPanelRef = useCallback(
    function (node: HTMLDivElement | null) {
      panelRef.current = node;
      if (node && isOpen) scheduleReposition();
    },
    [isOpen, scheduleReposition]
  );

  const isInside = useCallback(
    function (target: Node) {
      return Boolean(
        anchorRef.current?.contains(target) || panelRef.current?.contains(target)
      );
    },
    [anchorRef]
  );

  usePopoverLayer({
    open: isOpen,
    reposition: scheduleReposition,
    isInside,
    onPointerOutsideDismiss: onClose,
    onEscape: onClose,
  });

  useLayoutEffect(
    function () {
      if (!isOpen) {
        setIsPositioned(false);
        return;
      }
      setError(apiKey ? null : "Add NEXT_PUBLIC_GIPHY_API_KEY to use GIF search.");
      scheduleReposition();
    },
    [apiKey, isOpen, scheduleReposition]
  );

  if (!isOpen) return null;

  const gridWidth = Math.max(240, panelWidth - 16);

  return (
    <BodyPortal>
      <div
        ref={setPanelRef}
        data-composer-popover
        className="fixed z-[calc(var(--z-composer)+2)] flex flex-col overflow-hidden overscroll-y-contain rounded-2xl border border-border bg-elevated shadow-lg"
        style={{
          top: position.top,
          bottom: position.bottom,
          left: position.left,
          width: panelWidth,
          maxHeight: position.maxHeight,
          visibility: isPositioned ? "visible" : "hidden",
        }}
      >
        <div className="flex items-center gap-2 border-b border-border p-2">
          <div className="flex flex-1 items-center gap-1.5 rounded-xl bg-sunken px-2.5 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-fg-muted" strokeWidth={2} />
            <input
              type="search"
              value={query}
              maxLength={50}
              onChange={function (event) {
                setQuery(event.target.value);
                setError(null);
              }}
              placeholder="Search GIPHY…"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-fg placeholder:text-fg-muted focus:outline-none"
              aria-label="Search GIFs"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {error ? (
            <p className="px-3 py-8 text-center text-[13px] leading-relaxed text-fg-muted">
              {error}
            </p>
          ) : giphy ? (
            <GiphyGrid
              key={normalizedQuery || "trending"}
              width={gridWidth}
              columns={2}
              gutter={6}
              fetchGifs={fetchGifs}
              noLink
              borderRadius={8}
              noResultsMessage="No GIFs found"
              onGifsFetchError={function () {
                setError("Couldn’t load GIFs from GIPHY.");
              }}
              onGifClick={function (gif, event) {
                event.preventDefault();
                const gifUrl = gif.images.original?.url;
                if (!gifUrl) return;
                onSelect(gifUrl);
                onClose();
              }}
            />
          ) : null}
        </div>

        <div className="border-t border-border px-3 py-2 text-right text-[10px] font-semibold tracking-[0.04em] text-fg-muted">
          Powered by GIPHY
        </div>
      </div>
    </BodyPortal>
  );
}
