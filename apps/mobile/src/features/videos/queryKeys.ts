import { feedKeys } from "@/features/feed/queryKeys";

export const videoPostKeys = {
  all: ["video-posts"] as const,
  feed: feedKeys.home,
  playback: (assetId: string) => [...videoPostKeys.all, "playback", assetId] as const,
  settings: () => [...videoPostKeys.all, "settings"] as const,
};
