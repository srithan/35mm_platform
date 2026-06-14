import type { FilmListSummary } from "@35mm/types";
import { formatCount } from "@/lib/utils/formatCount";

export function formatListMeta(list: FilmListSummary): string {
  var parts = [
    `${list.entryCount} ${list.entryCount === 1 ? "film" : "films"}`,
    `${formatCount(list.likeCount)} ${list.likeCount === 1 ? "like" : "likes"}`,
    list.visibility === "private" ? "Private" : "Public",
  ];
  if (list.type === "watchlist") parts.unshift("Watchlist");
  if (list.isRanked) parts.push("Ranked");
  return parts.join(" · ");
}

export function parseListTags(value: string): string[] {
  return value
    .split(",")
    .map(function (tag) {
      return tag.trim();
    })
    .filter(Boolean);
}

export function joinListTags(tags: string[]): string {
  return tags.join(", ");
}
