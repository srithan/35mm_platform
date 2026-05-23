"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { getMockPortraitUrlForUsername } from "@/lib/constants/mockPortraitUrl";
import { SIDEBAR_PEOPLE_SUGGESTIONS } from "@/features/suggestions";

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
          <span key={item.label}>
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
    "calc(var(--site-header-sticky-offset, 4.5rem) + var(--home-main-below-header-gap, 1rem) + 1rem)";
  var maxHFloating =
    "calc(100vh - var(--site-header-sticky-offset, 4.5rem) - var(--home-main-below-header-gap, 1rem) - 2rem)";

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

  return (
    <aside className={outer} style={railStyles}>
      <div
        className={
          layoutMode === "floating"
            ? "w-full max-w-[320px] overflow-y-auto [scrollbar-width:thin] pb-8"
            : "w-full max-w-[320px] pb-8 overflow-visible"
        }
      >
        <section className="rounded-lg border border-border bg-bg px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-[15px] font-bold text-fg tracking-tight">Suggestions for you</h2>
            <Link
              href={ROUTES.SUGGESTIONS_PEOPLE}
              className="text-[12px] font-bold text-fg hover:text-fg-muted transition-colors uppercase tracking-wide"
            >
              See All
            </Link>
          </div>
          <ul className="space-y-4 m-0 p-0 list-none">
            {SIDEBAR_PEOPLE_SUGGESTIONS.map(function (row) {
              var src = getMockPortraitUrlForUsername(row.username);
              var profileHref = ROUTES.PROFILE(row.username);
              return (
                <li key={row.username} className="flex items-start gap-3 min-w-0">
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
                      {row.username}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-fg-muted leading-snug truncate">
                      {row.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[12px] font-bold text-[#0095f6] hover:text-[#1877f2] px-0 py-0.5 mt-1 bg-transparent border-none cursor-pointer"
                  >
                    Follow
                  </button>
                </li>
              );
            })}
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
