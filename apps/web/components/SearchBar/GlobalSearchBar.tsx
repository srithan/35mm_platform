"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSiteSearch } from "@/features/search/hooks/useSiteSearch";
import { ROUTES } from "@/lib/constants/routes";
import { SearchBar } from "./SearchBar";
import type { SearchResult } from "./types";

export interface GlobalSearchBarProps {
  className?: string;
}

export function GlobalSearchBar({ className }: GlobalSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const searchQuery = useSiteSearch(query);
  const results = useMemo<SearchResult[]>(function () {
    return (searchQuery.data?.items ?? []).map(function (item) {
      if (item.type === "film") {
        const details = [
          item.year ? String(item.year) : null,
          item.genres[0] ?? null,
          item.director,
        ].filter(Boolean);
        return {
          id: "film:" + item.id,
          label: item.title,
          sublabel: details.join(" · "),
          type: "film",
          imageUrl: item.posterUrl,
          href: ROUTES.TITLE("movie", item.title),
        };
      }
      if (item.type === "user") {
        return {
          id: "user:" + item.id,
          label: item.displayName,
          sublabel: "@" + item.username,
          type: "user",
          imageUrl: item.avatarUrl,
          initial: item.displayName.slice(0, 1).toUpperCase(),
          isPrivate: item.isPrivate,
          href: ROUTES.PROFILE(item.username),
        };
      }
      return {
        id: "post:" + item.id,
        label: item.headline || item.excerpt,
        sublabel: "@" + item.username,
        type: "post",
        href: ROUTES.POST(item.username, item.id),
      };
    });
  }, [searchQuery.data?.items]);

  return (
    <SearchBar
      placeholder="Search 35mm"
      category="all"
      variant="inline"
      size="compact"
      showEmptySuggestions
      className={className}
      results={results}
      isLoading={searchQuery.isFetching}
      isError={searchQuery.isError}
      onSearch={setQuery}
      onClear={function () {
        setQuery("");
      }}
      onNavigate={function (href) {
        router.push(href);
      }}
    />
  );
}
