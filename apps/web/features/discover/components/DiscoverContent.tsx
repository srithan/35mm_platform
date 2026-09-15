"use client";

import { useRouter } from "next/navigation";
import { BROWSE_RAIL_ENABLED } from "@/lib/config/uiFlags";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { tmdbItemToTitlePath } from "@/lib/title/paths";
import { DiscoverTabs } from "./DiscoverTabs";
import { ExploreTabContent } from "./ExploreTabContent";

export function DiscoverContent() {
  const router = useRouter();

  const goToTitle = function (film: TMDBMovie) {
    router.push(tmdbItemToTitlePath(film), { scroll: true });
  };

  return (
    <div className="min-h-full w-full bg-bg md:mx-0 md:max-w-none">
      {!BROWSE_RAIL_ENABLED ? <DiscoverTabs active="discover" /> : null}
      <div
        className={
          BROWSE_RAIL_ENABLED
            ? "w-full pb-12 pt-safe lg:pt-0"
            : "mx-auto w-full max-w-[1400px] px-4 pb-12 pt-safe sm:px-6 lg:px-10 lg:pt-0"
        }
      >
        <main className="min-w-0">
          <ExploreTabContent onOpenDetail={goToTitle} />
        </main>
      </div>
    </div>
  );
}
