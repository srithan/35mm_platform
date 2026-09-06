"use client";

import Link from "next/link";
import { LazyImage } from "@/components/LazyImage";
import { EmptyState } from "@/components/EmptyState";
import { ROUTES } from "@/lib/constants/routes";
import { tmdbItemToTitlePath } from "@/lib/title/paths";
import { posterUrl, yearFromDate } from "../lib/tmdb-utils";
import type { TMDBMultiSearchResult, TMDBSearchPerson } from "@/lib/tmdb/types";
import { DiscoverSearchResultsSkeleton } from "./DiscoverSkeletons";

interface SearchResultsViewProps {
  query: string;
  results: TMDBMultiSearchResult[];
  loading: boolean;
}

function isPersonResult(result: TMDBMultiSearchResult): result is TMDBSearchPerson {
  return result.media_type === "person";
}

export function SearchResultsView({
  query,
  results,
  loading,
}: SearchResultsViewProps) {
  if (loading) {
    return <DiscoverSearchResultsSkeleton />;
  }

  if (results.length === 0) {
    return (
      <EmptyState
        size="md"
        icon={<span className="text-[18px]">🔎</span>}
        headline={`No results for "${query}"`}
        subline="Try a different search or browse the discover page"
        primaryCta={{ label: "Browse discover", href: "/discover" }}
      />
    );
  }

  return (
    <div className="py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {results.map(function (result) {
          const person = isPersonResult(result);
          const name = person
            ? result.name
            : result.title || result.name || "Unknown";
          const imagePath = person ? result.profile_path : result.poster_path;
          const metadata = person
            ? result.known_for_department || "Person"
            : yearFromDate(result.release_date || result.first_air_date || "");
          const href = person
            ? ROUTES.PERSON(result.id)
            : tmdbItemToTitlePath(result);

          return (
            <Link
              key={(result.media_type || "movie") + "-" + result.id}
              href={href}
              className="text-left group"
            >
              <div className="mb-2 aspect-[2/3] overflow-hidden rounded-sm bg-[var(--discover-placeholder)] shadow-md transition-transform duration-300 group-hover:-translate-y-1">
                <LazyImage
                  src={posterUrl(imagePath)}
                  alt={name}
                  aspectRatio="2/3"
                  className="w-full h-full"
                />
              </div>
              <div className="text-[13px] leading-snug text-fg line-clamp-2">
                {name}
              </div>
              <div className="text-[10.5px] text-fg-muted mt-0.5">
                {metadata}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
