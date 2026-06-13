"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { getMockPortraitUrlForUsername } from "@/lib/constants/mockPortraitUrl";
import { cn } from "@/lib/utils/cn";
import { LetterboxdImportWidget } from "@/features/letterboxd-import";
import { usePeopleSuggestions, useSuggestionFollowMutation } from "@/features/suggestions/hooks/useSuggestions";
import type { FollowSuggestion } from "@35mm/types";

/** Second-line items point at discover/onboarding stubs until dedicated pages exist. */
const FOOTER_LINKS_ROW_ONE: { label: string; href: string }[] = [
  { label: "About", href: "/about" },
  { label: "Help", href: "/help" },
  { label: "Press", href: "/about" },
  { label: "API", href: ROUTES.DISCOVER },
  { label: "Jobs", href: ROUTES.DISCOVER },
];

const FOOTER_LINKS_ROW_TWO: { label: string; href: string }[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Locations", href: ROUTES.DISCOVER },
  { label: "Language", href: ROUTES.SETTINGS },
];

function MiddotSeparatedLinks(props: {
  rows: { label: string; href: string }[];
}) {
  var rows = props.rows;
  return (
    <>
      {rows.map(function (item, idx) {
        var isLast = idx === rows.length - 1;
        return (
          <span key={item.label + "-" + item.href}>
            <Link href={item.href} className="hover:underline hover:text-fg transition-colors">
              {item.label}
            </Link>
            {isLast ? null : (
              <>
                {" "}
                <span aria-hidden>&middot;</span>{" "}
              </>
            )}
          </span>
        );
      })}
    </>
  );
}

type SuggestionsRailLayout = "floating" | "attached";

interface HomeSuggestionsSidebarProps {
  /**
   * `floating` — fixed rail beside the centered 640px feed (home).
   * `attached` — sticky column in normal flow beside a full-width main (profiles).
   */
  layout?: SuggestionsRailLayout;
}

/** Viewport-fixed below header (`floating`), or sticky column (`attached`). */
export function HomeSuggestionsSidebar(props?: HomeSuggestionsSidebarProps) {
  var layoutMode: SuggestionsRailLayout = props && props.layout ? props.layout : "floating";
  /** 1rem below `#site-nav` — profile rail stickiness handled by ShellGrid wrapper. */
  var railTopFloating =
    "calc(var(--site-header-sticky-offset, 4.5rem) + var(--home-main-below-header-gap, 1rem))";
  var maxHFloating =
    "calc(100vh - var(--site-header-sticky-offset, 4.5rem) - var(--home-main-below-header-gap, 1rem) - env(safe-area-inset-bottom, 0px))";

  var railStyles: CSSProperties =
    layoutMode === "floating"
      ? {
          top: railTopFloating,
          left: "calc(50vw + 320px + var(--home-sidebar-gap, 2rem))",
          maxHeight: maxHFloating,
        }
      : {};

  var outer =
    layoutMode === "floating"
      ? "hidden xl:block xl:fixed xl:z-10 xl:w-[min(320px,calc((100vw-640px)*0.5-2.5rem))] xl:min-w-0 xl:pb-12"
      : "w-full xl:min-w-0 xl:block";

  var suggestionsQuery = usePeopleSuggestions({ limit: 5 });
  var followMutation = useSuggestionFollowMutation();
  var suggestions = suggestionsQuery.data?.suggestions ?? [];
  var [followingByUserId, setFollowingByUserId] = useState<Record<string, boolean>>({});
  var [submittingByUserId, setSubmittingByUserId] = useState<Record<string, boolean>>({});

  return (
    <aside className={outer} style={railStyles}>
      <div
        className={
          layoutMode === "floating"
            ? "w-full max-w-[320px] overflow-y-auto [scrollbar-width:thin] pb-8"
            : "w-full max-w-[320px] pb-8 overflow-visible"
        }
      >
        <LetterboxdImportWidget />

        <section className="rounded-lg border border-border bg-bg px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-[15px] font-bold text-fg tracking-tight">Suggestions for you</h2>
            {suggestions.length > 0 ? (
              <Link
                href={ROUTES.SUGGESTIONS_PEOPLE}
                className="text-[12px] font-bold text-fg hover:text-fg-muted transition-colors uppercase tracking-wide"
              >
                See All
              </Link>
            ) : null}
          </div>
          <ul
            className="space-y-4 m-0 p-0 list-none"
            aria-busy={suggestionsQuery.isLoading}
            aria-live="polite"
          >
            {suggestionsQuery.isLoading ? (
              <SuggestionsSidebarSkeleton />
            ) : suggestions.length === 0 ? (
              <SuggestionsSidebarEmptyState
                variant={suggestionsQuery.data?.computing ? "computing" : "empty"}
              />
            ) : null}
            {!suggestionsQuery.isLoading
              ? suggestions.map(function (row, idx) {
              var isFollowing = Boolean(followingByUserId[row.user.id]);
              var isSubmitting = Boolean(submittingByUserId[row.user.id]);
              return (
                <SuggestionRow
                  key={row.user.id + "-" + row.signalType + "-" + idx}
                  row={row}
                  isFollowing={isFollowing}
                  isSubmitting={isSubmitting}
                  onFollow={function () {
                    var userId = row.user.id;
                    var nextFollowing = !isFollowing;
                    setFollowingByUserId(function (current) {
                      return {
                        ...current,
                        [userId]: nextFollowing,
                      };
                    });
                    setSubmittingByUserId(function (current) {
                      return {
                        ...current,
                        [userId]: true,
                      };
                    });

                    followMutation.mutate(
                      { userId: userId, isFollowing: isFollowing },
                      {
                        onError: function () {
                          setFollowingByUserId(function (current) {
                            return {
                              ...current,
                              [userId]: isFollowing,
                            };
                          });
                        },
                        onSettled: function () {
                          setSubmittingByUserId(function (current) {
                            var next = { ...current };
                            delete next[userId];
                            return next;
                          });
                        },
                      }
                    );
                  }}
                />
              );
            })
              : null}
          </ul>
        </section>

        <nav
          aria-label="Site links"
          className="mt-6 px-2 text-[11px] text-fg-muted leading-relaxed uppercase tracking-[0.04em]"
        >
          <p className="mb-2">
            <MiddotSeparatedLinks rows={FOOTER_LINKS_ROW_ONE} />
          </p>
          <p className="mb-0">
            <MiddotSeparatedLinks rows={FOOTER_LINKS_ROW_TWO} />
          </p>
        </nav>
        <p className="mt-6 px-2 text-[11px] text-fg-faint uppercase tracking-[0.12em]">
          &copy; 2026 35MM
        </p>
      </div>
    </aside>
  );
}

const SKELETON_NAME_WIDTHS = ["w-[72%]", "w-[58%]", "w-[64%]", "w-[52%]", "w-[68%]"] as const;
const SKELETON_SIGNAL_WIDTHS = ["w-[92%]", "w-[78%]", "w-[85%]", "w-[70%]", "w-[88%]"] as const;

function SuggestionSkeletonBar(props: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block overflow-hidden rounded-sm",
        "bg-gradient-to-r from-skeleton via-skeleton-strong to-skeleton",
        "bg-skeleton-shimmer animate-skeleton-shimmer",
        props.className
      )}
    />
  );
}

function SuggestionRowSkeleton(props: { index: number }) {
  var nameWidth = SKELETON_NAME_WIDTHS[props.index % SKELETON_NAME_WIDTHS.length];
  var signalWidth = SKELETON_SIGNAL_WIDTHS[props.index % SKELETON_SIGNAL_WIDTHS.length];

  return (
    <li className="flex min-w-0 items-start gap-3" aria-hidden>
      <SuggestionSkeletonBar className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 pt-0.5">
        <SuggestionSkeletonBar className={cn("h-3.5 rounded", nameWidth)} />
        <SuggestionSkeletonBar className={cn("mt-2 h-2.5 rounded", signalWidth)} />
        <SuggestionSkeletonBar className="mt-1 h-2.5 w-[45%] rounded" />
      </div>
      <SuggestionSkeletonBar className="mt-1 h-3 w-10 shrink-0 rounded" />
    </li>
  );
}

function SuggestionsSidebarSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map(function (_, index) {
        return <SuggestionRowSkeleton key={"suggestion-skeleton-" + index} index={index} />;
      })}
    </>
  );
}

function SuggestionsSidebarEmptyState(props: { variant: "computing" | "empty" }) {
  if (props.variant === "computing") {
    return (
      <li className="list-none py-3" role="status">
        <div className="flex flex-col items-center px-2 text-center">
          <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-sunken">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" strokeWidth={1.75} aria-hidden />
          </div>
          <p className="text-[13px] font-bold text-fg">Finding your crowd</p>
          <p className="mt-1.5 max-w-[250px] text-[12px] leading-relaxed text-fg-muted">
            Matching you with film lovers based on who you follow and what you watch.
          </p>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map(function (dotIndex) {
              return (
                <span
                  key={"computing-dot-" + dotIndex}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-fg-faint"
                  style={{ animationDelay: dotIndex * 0.22 + "s" }}
                />
              );
            })}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="list-none py-2" role="status">
      <div className="flex flex-col items-center px-1 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-gradient-to-br from-sunken to-bg">
          <Users className="h-5 w-5 text-fg-muted" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="text-[13px] font-bold text-fg">No one new to suggest</p>
        <p className="mt-1.5 max-w-[250px] text-[12px] leading-relaxed text-fg-muted">
          Follow a few filmmakers or log some films — we&apos;ll find your next favorite account.
        </p>
        <Link
          href={ROUTES.DISCOVER}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#0095f6] transition-colors hover:text-[#1877f2]"
        >
          Explore Discover
          <ArrowRight className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
    </li>
  );
}

function SuggestionRow(props: {
  row: FollowSuggestion;
  isFollowing: boolean;
  isSubmitting: boolean;
  onFollow: () => void;
}) {
  var row = props.row;
  var profileHref = ROUTES.PROFILE(row.user.username);
  var src = row.user.avatarUrl ?? getMockPortraitUrlForUsername(row.user.username);
  var followLabel = props.isSubmitting ? "..." : props.isFollowing ? "Following" : "Follow";
  return (
    <li className="flex items-start gap-3 min-w-0">
      <Link
        href={profileHref}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-border ring-1 ring-black/[0.04]"
      >
        <Image
          src={src}
          alt=""
          width={44}
          height={44}
          className="h-full w-full object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1 pt-0.5">
        <Link
          href={profileHref}
          className="block font-bold text-[14px] leading-tight text-fg truncate hover:underline"
        >
          {row.user.displayName}
        </Link>
        <p className="mt-0.5 text-[12px] text-fg-muted leading-snug line-clamp-2">
          {row.signalLabel}
        </p>
      </div>
      <button
        type="button"
        disabled={props.isSubmitting}
        onClick={props.onFollow}
        className="shrink-0 text-[12px] font-bold text-[#0095f6] hover:text-[#1877f2] px-0 py-0.5 mt-1 bg-transparent border-none cursor-pointer disabled:opacity-60"
      >
        {followLabel}
      </button>
    </li>
  );
}
