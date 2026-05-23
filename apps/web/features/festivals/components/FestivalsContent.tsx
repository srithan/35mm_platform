"use client";

import { useState, useMemo } from "react";
import { LayoutList, LayoutGrid, Check } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FestivalFilters } from "./FestivalFilters";
import { FestivalCard } from "./FestivalCard";
import { MOCK_FESTIVALS } from "../data/mockFestivals";
import { cn } from "@/lib/utils/cn";
import { FilterSidebarPageShell } from "@/components/layout/FilterSidebarPageShell";
import { FilmReelIcon } from "@/components/FilmReelIcon/FilmReelIcon";
import {
  sidebarFilterSectionTitle,
  sidebarFilterListWrap,
  sidebarFilterToggleRow,
} from "@/components/filters/sidebarFilterStyles";

export function FestivalsContent() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [eventType, setEventType] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Next Deadlines");
  const [academyQualifyingOnly, setAcademyQualifyingOnly] = useState(false);
  const [highlyReviewedOnly, setHighlyReviewedOnly] = useState(false);

  const toggleCategory = function (cat: string) {
    setCategories(function (prev) {
      return prev.includes(cat) ? prev.filter(function (c) {
        return c !== cat;
      }) : prev.concat([cat]);
    });
  };

  const filtered = useMemo(
    function () {
      let result = MOCK_FESTIVALS.slice();

      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter(function (f) {
          return (
            f.name.toLowerCase().includes(q) ||
            f.location.toLowerCase().includes(q) ||
            f.country.toLowerCase().includes(q)
          );
        });
      }

      if (openOnly) result = result.filter(function (f) {
        return f.isOpen;
      });

      if (eventType) {
        const typeMap: Record<string, string[]> = {
          "Film Festivals": ["film-festival"],
          "Screenwriting Contests": ["screenwriting"],
          "Music Contests": ["music"],
          "Photography Contests": ["photography"],
          "Online Festivals / Awards": ["online"],
          Events: ["event", "awards-ceremony", "conference-festival", "festival-market"],
        };
        const vals = typeMap[eventType];
        if (vals) {
          result = result.filter(function (f) {
            return vals.includes(f.eventType);
          });
        }
      }

      if (categories.length > 0) {
        result = result.filter(function (f) {
          return categories.some(function (c) {
            return f.categories.some(function (fc) {
              return fc.toLowerCase().includes(c.toLowerCase());
            });
          });
        });
      }

      if (academyQualifyingOnly) {
        result = result.filter(function (f) {
          return (f.badges || []).indexOf("academy-award") >= 0;
        });
      }

      if (highlyReviewedOnly) {
        result = result.filter(function (f) {
          return (f.badges || []).indexOf("best-reviewed") >= 0;
        });
      }

      if (sortBy === "Next Deadlines") {
        result.sort(function (a, b) {
          if (!a.nextDeadline) return 1;
          if (!b.nextDeadline) return -1;
          return a.nextDeadline.localeCompare(b.nextDeadline);
        });
      } else if (sortBy === "Years Running") {
        result.sort(function (a, b) {
          return b.yearsRunning - a.yearsRunning;
        });
      }

      return result;
    },
    [
      search,
      eventType,
      categories,
      openOnly,
      sortBy,
      academyQualifyingOnly,
      highlyReviewedOnly,
    ]
  );

  const docCategoryOn = categories.indexOf("Documentary") >= 0;
  const shortCategoryOn = categories.indexOf("Short") >= 0;

  const toggleDocCategory = function () {
    toggleCategory("Documentary");
  };

  const toggleShortCategory = function () {
    toggleCategory("Short");
  };

  return (
    <div className="px-4 md:px-6 pb-10">
      <FilterSidebarPageShell
        rowClassName="flex flex-col lg:flex-row lg:gap-8 pt-6 lg:pt-0"
        preset="festivals"
        sidebarHeader={
          <>
            <h1 className="text-[20px] lg:text-[22px] leading-tight text-fg font-semibold flex items-center gap-2">
              <FilmReelIcon className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px] shrink-0 text-fg" />
              Film Festivals
              <FilmReelIcon className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px] shrink-0 text-fg scale-x-[-1]" />
            </h1>
            <p className="mt-1.5 text-[12px] text-fg-muted leading-snug">
              Discover festivals, screenwriting contests, and submission opportunities.
            </p>
          </>
        }
        sidebarBody={
          <div className="space-y-5">
            <SearchBar
              placeholder="Search festivals, locations"
              onSearch={setSearch}
              category="festivals"
              variant="inline"
              size="compact"
              showDropdown={false}
            />
            <div>
              <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Popular picks</p>
              <div className={cn(sidebarFilterListWrap, "shadow-sm")}>
                <button
                  type="button"
                  aria-pressed={academyQualifyingOnly}
                  onClick={function () {
                    setAcademyQualifyingOnly(function (v) {
                      return !v;
                    });
                  }}
                  className={sidebarFilterToggleRow(academyQualifyingOnly)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      academyQualifyingOnly
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-bg"
                    )}
                  >
                    {academyQualifyingOnly ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span className="flex-1 text-left">Academy Award qualifying</span>
                </button>
                <button
                  type="button"
                  aria-pressed={highlyReviewedOnly}
                  onClick={function () {
                    setHighlyReviewedOnly(function (v) {
                      return !v;
                    });
                  }}
                  className={sidebarFilterToggleRow(highlyReviewedOnly)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      highlyReviewedOnly
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-bg"
                    )}
                  >
                    {highlyReviewedOnly ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span className="flex-1 text-left">Highly reviewed</span>
                </button>
                <button
                  type="button"
                  aria-pressed={docCategoryOn}
                  onClick={toggleDocCategory}
                  className={sidebarFilterToggleRow(docCategoryOn)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      docCategoryOn
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-bg"
                    )}
                  >
                    {docCategoryOn ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex-1 text-left">Documentary programs</span>
                </button>
                <button
                  type="button"
                  aria-pressed={shortCategoryOn}
                  onClick={toggleShortCategory}
                  className={sidebarFilterToggleRow(shortCategoryOn)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      shortCategoryOn
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-bg"
                    )}
                  >
                    {shortCategoryOn ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex-1 text-left">Short film programs</span>
                </button>
              </div>
            </div>
            <FestivalFilters
              variant="sidebar"
              noBorder
              eventType={eventType}
              onEventTypeChange={setEventType}
              categories={categories}
              onCategoryToggle={toggleCategory}
              openOnly={openOnly}
              onOpenOnlyChange={setOpenOnly}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        }
      >
        
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border bg-bg">
            <span className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium">
              {filtered.length} Festival{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={function () {
                  setViewMode("list");
                }}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "list"
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
                    : "bg-elevated text-fg-muted hover:text-fg"
                )}
                title="List view"
              >
                <LayoutList className="w-4 h-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={function () {
                  setViewMode("grid");
                }}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid"
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
                    : "bg-elevated text-fg-muted hover:text-fg"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="pt-4">
            <div
              className={
                viewMode === "list"
                  ? "flex flex-col gap-2.5"
                  : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              }
            >
              {filtered.map(function (festival) {
                return <FestivalCard key={festival.id} festival={festival} variant={viewMode} />;
              })}
            </div>
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-fg-muted text-sm">
                No festivals match your filters. Try adjusting your search.
              </div>
            ) : null}
          </div>
      </FilterSidebarPageShell>
    </div>
  );
}
