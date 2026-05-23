import type { TitleMedia } from "@/lib/title/paths";

const STORAGE_PREFIX = "35mm.title-actions.";

function key(media: TitleMedia, id: string): string {
  return STORAGE_PREFIX + media + "." + id;
}

export type TitleActionState = { watched: boolean; watchlist: boolean };

const empty: TitleActionState = { watched: false, watchlist: false };

function parse(raw: string | null): TitleActionState {
  if (!raw) return empty;
  try {
    const o = JSON.parse(raw) as { w?: boolean; l?: boolean };
    return { watched: Boolean(o.w), watchlist: Boolean(o.l) };
  } catch {
    return empty;
  }
}

export function readTitleActionState(
  media: TitleMedia,
  id: string
): TitleActionState {
  if (typeof window === "undefined") return empty;
  return parse(window.localStorage.getItem(key(media, id)));
}

export function writeTitleActionState(
  media: TitleMedia,
  id: string,
  next: TitleActionState
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    key(media, id),
    JSON.stringify({ w: next.watched, l: next.watchlist })
  );
}
