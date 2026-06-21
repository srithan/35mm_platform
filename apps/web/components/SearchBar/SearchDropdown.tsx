"use client";

import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SearchNoResults } from "./SearchNoResults";
import { SearchResultRow } from "./SearchResultRow";
import {
  QUICK_LINKS,
  RESULT_GROUP_LABELS,
  RESULT_GROUP_ORDER,
  TRENDING_PILLS,
} from "./searchConstants";
import type {
  SearchQuickLink,
  SearchResult,
  SearchTrendingPill,
} from "./types";

export interface SearchDropdownProps {
  listId: string;
  listboxRef: React.RefObject<HTMLUListElement>;
  debouncedQuery: string;
  isLoading: boolean;
  isError: boolean;
  showRecents: boolean;
  showEmptySuggestions: boolean;
  showRecentsOnly: boolean;
  showResults: boolean;
  recents: SearchResult[];
  results: SearchResult[];
  activeIndex: number;
  onSelect: (item: SearchResult) => void;
  onSelectPill: (pill: SearchTrendingPill) => void;
  onSelectQuickLink: (link: SearchQuickLink) => void;
  onHover: (index: number) => void;
  onClearRecents: () => void;
  onRemoveRecent: (id: string) => void;
  className?: string;
}

function groupResults(results: SearchResult[]) {
  const groups: { type: string; items: SearchResult[] }[] = [];

  for (const type of RESULT_GROUP_ORDER) {
    const items = results.filter((item) => item.type === type);
    if (items.length > 0) {
      groups.push({ type, items });
    }
  }

  const known = new Set<string>(RESULT_GROUP_ORDER);
  const other = results.filter((item) => !item.type || !known.has(item.type));
  if (other.length > 0) {
    groups.push({ type: "other", items: other });
  }

  return groups;
}

function DropdownSectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li
      role="presentation"
      className="flex items-center justify-between px-3 pb-1.5 pt-2.5"
    >
      <span className="text-[10px] uppercase tracking-[0.08em] text-fg-muted">
        {children}
      </span>
      {action}
    </li>
  );
}

function QuickLinkRow({
  link,
  index,
  isActive,
  onHover,
  onSelect,
}: {
  link: SearchQuickLink;
  index: number;
  isActive: boolean;
  onHover: (index: number) => void;
  onSelect: (link: SearchQuickLink) => void;
}) {
  const Icon = link.icon;

  return (
    <li
      id={`searchbar-item-${index}`}
      role="option"
      aria-selected={isActive}
      className={cn(
        "group relative mx-1.5 my-0.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
        "transition-[background-color,transform,box-shadow] duration-150 ease-out",
        "hover:bg-sunken motion-safe:hover:translate-x-0.5",
        "active:scale-[0.995] motion-safe:active:translate-x-px",
        isActive &&
          "bg-[color-mix(in_srgb,var(--accent)_7%,var(--sunken))] shadow-[inset_2px_0_0_0_var(--accent)] motion-safe:translate-x-0.5",
      )}
      onMouseEnter={() => onHover(index)}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(link);
      }}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-hover text-fg-muted transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.04]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-fg">{link.label}</div>
        {link.sublabel ? (
          <div className="mt-0.5 truncate text-[11px] text-fg-muted">
            {link.sublabel}
          </div>
        ) : null}
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-fg-faint opacity-0 transition-opacity group-hover:opacity-100" />
    </li>
  );
}

export function SearchDropdown({
  listId,
  listboxRef,
  debouncedQuery,
  isLoading,
  isError,
  showRecents,
  showEmptySuggestions,
  showRecentsOnly,
  showResults,
  recents,
  results,
  activeIndex,
  onSelect,
  onSelectPill,
  onSelectQuickLink,
  onHover,
  onClearRecents,
  onRemoveRecent,
  className,
}: SearchDropdownProps) {
  const groupedResults = groupResults(results);
  let resultOffset = 0;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-[100] mt-2 overflow-hidden rounded-xl border border-border bg-elevated shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
        className,
      )}
    >
      <ul
        id={listId}
        ref={listboxRef}
        role="listbox"
        aria-label="Search results"
        className="max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain py-1"
      >
        {showRecentsOnly ? (
          <>
            <DropdownSectionLabel
              action={
                <button
                  type="button"
                  onClick={onClearRecents}
                  className="text-[10px] text-fg-muted transition-colors hover:text-fg"
                >
                  Clear all
                </button>
              }
            >
              Recent
            </DropdownSectionLabel>
            {recents.map((item, index) => (
              <SearchResultRow
                key={item.id}
                item={item}
                index={index}
                isActive={index === activeIndex}
                onSelect={onSelect}
                onHover={onHover}
                onRemoveRecent={onRemoveRecent}
                showRecentIcon
              />
            ))}
          </>
        ) : null}

        {showEmptySuggestions ? (
          <>
            <DropdownSectionLabel>Trending</DropdownSectionLabel>
            <li role="presentation" className="px-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_PILLS.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectPill(pill);
                    }}
                    className={cn(
                      "inline-flex items-center rounded-full border border-border bg-sunken px-2.5 py-1",
                      "text-[12px] font-medium text-fg-muted",
                      "transition-[background-color,border-color,color,transform] duration-150 ease-out",
                      "hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_6%,var(--sunken))] hover:text-fg",
                      "active:scale-[0.97]",
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </li>

            {showRecents ? (
              <>
                <DropdownSectionLabel
                  action={
                    <button
                      type="button"
                      onClick={onClearRecents}
                      className="text-[10px] text-fg-muted transition-colors hover:text-fg"
                    >
                      Clear all
                    </button>
                  }
                >
                  Recent
                </DropdownSectionLabel>
                {recents.map((item, index) => (
                  <SearchResultRow
                    key={item.id}
                    item={item}
                    index={index}
                    isActive={index === activeIndex}
                    onSelect={onSelect}
                    onHover={onHover}
                    onRemoveRecent={onRemoveRecent}
                    showRecentIcon
                  />
                ))}
              </>
            ) : null}

            <DropdownSectionLabel>Suggestions</DropdownSectionLabel>
            {QUICK_LINKS.map((link, index) => {
              const itemIndex = recents.length + index;
              return (
                <QuickLinkRow
                  key={link.id}
                  link={link}
                  index={itemIndex}
                  isActive={itemIndex === activeIndex}
                  onHover={onHover}
                  onSelect={onSelectQuickLink}
                />
              );
            })}
          </>
        ) : null}

        {showResults && isLoading ? (
          <li
            role="presentation"
            className="flex items-center gap-2 px-3 py-3.5 text-[12px] text-fg-muted"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </li>
        ) : null}

        {showResults && !isLoading && isError ? (
          <li role="presentation" className="px-3 py-3.5 text-[12px] text-red-500">
            Something went wrong. Please try again.
          </li>
        ) : null}

        {showResults &&
        !isLoading &&
        !isError &&
        debouncedQuery.trim().length > 0 &&
        results.length === 0 ? (
          <li role="presentation">
            <SearchNoResults
              query={debouncedQuery}
              onSelectPill={onSelectPill}
            />
          </li>
        ) : null}

        {showResults && !isLoading && !isError
          ? groupedResults.map((group) => {
              const section = (
                <div key={group.type}>
                  <DropdownSectionLabel>
                    {RESULT_GROUP_LABELS[group.type] ?? "More"}
                  </DropdownSectionLabel>
                  {group.items.map((item) => {
                    const itemIndex = resultOffset;
                    resultOffset += 1;
                    return (
                      <SearchResultRow
                        key={item.id}
                        item={item}
                        index={itemIndex}
                        isActive={itemIndex === activeIndex}
                        onSelect={onSelect}
                        onHover={onHover}
                      />
                    );
                  })}
                </div>
              );
              return section;
            })
          : null}
      </ul>

      {showResults && !isLoading && results.length > 0 ? (
        <div className="border-t border-border px-3 py-2">
          <Link
            href={`/discover?q=${encodeURIComponent(debouncedQuery.trim())}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-fg-muted transition-colors hover:text-fg"
          >
            View all results
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
