"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import type { FestivalDetail } from "../data/mockFestivals";
import { cn } from "@/lib/utils/cn";

const CATEGORY_GROUPS: Record<string, string[]> = {
  "Narrative Film": [
    "Feature Film",
    "Short Narrative Film",
    "Animated",
    "Experimental Film",
    "Children's/Family",
    "Music Videos",
  ],
  Documentary: ["Documentary Feature", "Documentary Short"],
  Screenplay: ["Screenplay Competition", "TV/Cable/Internet Pilot"],
  "Genre & Special Interest": [
    "Sci-Fi & Fantasy",
    "Horror",
    "LGBTQ",
    "African-American",
    "Indigenous",
    "Jewish",
  ],
  "Regional & Language": [
    "Canadian",
    "French-speaking",
    "Japanese",
    "Chinese",
    "New England",
  ],
  Student: ["High School", "College"],
  "Other Formats": [
    "Webisodes",
    "Podcasts",
    "Video Games",
    "AI Generated",
    "COVID-19 - Healthcare",
  ],
};

const GROUP_GRIDS: Record<string, string> = {
  "Narrative Film": "grid-cols-1 sm:grid-cols-2",
  Documentary: "grid-cols-1 sm:grid-cols-2",
  Screenplay: "grid-cols-1 sm:grid-cols-2",
  "Genre & Special Interest": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "Regional & Language": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  Student: "grid-cols-1 sm:grid-cols-2",
  "Other Formats": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

function formatDeadlineShort(deadline: string): string {
  const match = deadline.match(/^(.+?):\s*(.+)$/);
  if (!match) return deadline;
  const [, label, dateStr] = match;
  const months: Record<string, string> = {
    January: "Jan", February: "Feb", March: "Mar", April: "Apr",
    May: "May", June: "Jun", July: "Jul", August: "Aug",
    September: "Sep", October: "Oct", November: "Nov", December: "Dec",
  };
  let shortDate = dateStr;
  for (const [full, abbr] of Object.entries(months)) {
    shortDate = shortDate.replace(new RegExp(`\\b${full}\\b`, "i"), abbr);
  }
  return `${label.trim()} · ${shortDate.trim()}`;
}

interface CatCardProps {
  category: string;
  fees: Array<{ deadline: string; standard: number; student?: number; gold?: number }>;
  addOn?: string;
  isOpen: boolean;
  onToggle: () => void;
  slug: string;
}

function CatCard({ category, fees, addOn, isOpen, onToggle, slug }: CatCardProps) {
  const fromPrice = fees.length > 0 ? Math.min(...fees.map((f) => f.standard)) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "border border-border rounded-lg overflow-hidden cursor-pointer transition-all duration-150 bg-elevated isolate",
        "hover:border-border-strong hover:shadow-sm",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        isOpen && "border-border-strong shadow-[0_2px_12px_rgba(26,22,18,0.08)] dark:shadow-none"
      )}
      aria-expanded={isOpen}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2.5 px-4 py-3 w-full text-left",
          isOpen && "bg-neutral-800 dark:bg-neutral-200"
        )}
      >
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-[13px] font-medium leading-tight",
              isOpen ? "text-white dark:text-neutral-900" : "text-fg"
            )}
          >
            {category}
          </div>
          <div
            className={cn(
              " text-[11px] whitespace-nowrap mt-0.5",
              isOpen ? "text-white/70 dark:text-neutral-600" : "text-fg-muted"
            )}
          >
            from ${fromPrice}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200",
            isOpen ? "text-white dark:text-neutral-900 rotate-180" : "text-neutral-500"
          )}
          strokeWidth={2.2}
          aria-hidden
        />
      </div>

      {isOpen && (
        <div className="border-t border-border">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-elevated border-b border-border">
                <th className="text-[9px] tracking-[0.1em] uppercase text-fg-muted px-3.5 py-1.5 text-left font-medium">
                  Deadline
                </th>
                <th className="text-[9px] tracking-[0.1em] uppercase text-fg-muted px-3.5 py-1.5 text-right font-medium">
                  Standard
                </th>
                {(fees[0]?.student != null || fees.some((f) => f.student != null)) && (
                  <th className="text-[9px] tracking-[0.1em] uppercase text-fg-muted px-3.5 py-1.5 text-right font-medium">
                    Student
                  </th>
                )}
                {(fees[0]?.gold != null || fees.some((f) => f.gold != null)) && (
                  <th className="text-[9px] tracking-[0.1em] uppercase text-fg-muted px-3.5 py-1.5 text-right font-medium">
                    Gold
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {fees.map((fee, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="py-2 px-3.5 text-[10.5px] text-fg-muted align-middle">
                    <span
                      className={cn(
                        "inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle",
                        i === 0 ? "bg-success" : "bg-warning"
                      )}
                    />
                    {formatDeadlineShort(fee.deadline)}
                  </td>
                  <td className="py-2 px-3.5 text-right text-[11.5px] font-medium text-fg align-middle">
                    ${fee.standard}
                  </td>
                  {(fees[0]?.student != null || fees.some((f) => f.student != null)) && (
                    <td className="py-2 px-3.5 text-right text-[10.5px] text-fg-muted align-middle">
                      {fee.student != null ? `$${fee.student}` : "—"}
                    </td>
                  )}
                  {(fees[0]?.gold != null || fees.some((f) => f.gold != null)) && (
                    <td className="py-2 px-3.5 text-right text-[10.5px] text-fg-muted align-middle">
                      {fee.gold != null ? `$${fee.gold}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-elevated">
            {addOn ? (
              <span className="text-[11px] text-fg-muted leading-relaxed flex-1">
                {addOn}
              </span>
            ) : (
              <span className="flex-1" />
            )}
            <Link
              href={ROUTES.FESTIVAL(slug)}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-accent text-white px-3 py-1.5 rounded transition-opacity hover:opacity-85 flex-shrink-0"
            >
              Submit →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoriesFeesTabProps {
  festival: FestivalDetail;
}

export function CategoriesFeesTab({ festival }: CategoriesFeesTabProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const categoryMap = new Map(
    festival.categoriesAndFees.map((c) => [c.category, c])
  );

  const toggleCategory = useCallback((category: string) => {
    setOpenCategory((prev) => (prev === category ? null : category));
  }, []);

  const groups = Object.entries(CATEGORY_GROUPS)
    .map(([groupName, categories]) => ({
      name: groupName,
      categories: categories.filter((cat) => categoryMap.has(cat)),
      gridClass: GROUP_GRIDS[groupName] ?? "grid-cols-1 sm:grid-cols-2",
    }))
    .filter((g) => g.categories.length > 0);

  if (festival.categoriesAndFees.length === 0) {
    return (
      <p className="text-[14px] text-fg-muted">
        Categories and fees will be displayed here. Visit the festival website for complete information.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[17px] italic font-semibold text-fg mb-1">
          Categories & Fees
        </h2>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Click a category to see the full fee table. Student and Gold member discounts apply to all categories.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.name} className="mt-10 first:mt-0">
          <div className="text-[9px] tracking-[0.13em] uppercase text-fg-muted pb-3 mb-4 border-b border-border">
            {group.name}
          </div>
          <div className={cn("grid gap-2 items-start", group.gridClass)}>
            {group.categories.map((catName) => {
              const cat = categoryMap.get(catName);
              if (!cat) return null;
              return (
                <CatCard
                  key={cat.category}
                  category={cat.category}
                  fees={cat.fees}
                  addOn={cat.addOn}
                  isOpen={openCategory === cat.category}
                  onToggle={() => toggleCategory(cat.category)}
                  slug={festival.slug}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
