import type { TitleMedia } from "@/lib/title/paths";

export const titleKeys = {
  filmReference: (media: TitleMedia, id: string) =>
    ["title", "film-reference", media, id] as const,
};
