"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { BrandLogo } from "@/components/Logo";
import { SearchBar } from "@/components/SearchBar";
import type { SearchResult } from "@/components/SearchBar";
import { useSiteSearch } from "@/features/search/hooks/useSiteSearch";
import styles from "../SiteHeader.module.css";

export function HeaderLeft() {
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
          href: ROUTES.TITLE("movie", item.id),
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
    <div className={styles.navLeft}>
      <BrandLogo
        href={ROUTES.HOME}
        className={styles.navLogo}
        style={{ fontSize: "1.75rem" }}
      />
      <div className={styles.headerSearchWrap}>
        <SearchBar
          placeholder="Search 35mm"
          category="all"
          variant="inline"
          size="compact"
          showEmptySuggestions
          className={styles.headerSearch}
          results={results}
          isLoading={searchQuery.isFetching}
          isError={searchQuery.isError}
          onSearch={setQuery}
          onClear={function () {
            setQuery("");
          }}
          onNavigate={(href) => router.push(href)}
        />
      </div>
    </div>
  );
}
