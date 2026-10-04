import type { TitleMedia } from "@/lib/title/paths";

export const titleKeys = {
  all: ["title"] as const,
  filmReference: (media: TitleMedia, id: string) =>
    ["title", "film-reference", media, id] as const,
  viewerStates: (filmId: string | null) =>
    ["title", "viewer-state", filmId] as const,
  viewerState: (filmId: string | null, viewerId: string | null | undefined) =>
    [...titleKeys.viewerStates(filmId), viewerId ?? "guest"] as const,
};
