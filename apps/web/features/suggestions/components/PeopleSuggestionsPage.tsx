"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, SlidersHorizontal } from "lucide-react";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { ROUTES } from "@/lib/constants/routes";
import { getMockPortraitUrlForUsername } from "@/lib/constants/mockPortraitUrl";
import { formatCount } from "@/lib/utils/formatCount";
import { cn } from "@/lib/utils/cn";
import {
  PEOPLE_SUGGESTIONS,
  type PeopleSuggestion,
  type PeopleSuggestionRole,
} from "../data/peopleSuggestions";

const ROLE_FILTERS: Array<PeopleSuggestionRole | "All"> = [
  "All",
  "Director",
  "DP",
  "Editor",
  "Critic",
  "Festival",
  "Producer",
  "Cinephile",
];

function SuggestionRow(props: {
  person: PeopleSuggestion;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  const { person, isFollowing, onToggleFollow } = props;
  const avatarUrl = getMockPortraitUrlForUsername(person.username);
  const profileHref = ROUTES.PROFILE(person.username);

  return (
    <article className="border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-hover/70 sm:px-5">
      <div className="flex gap-3.5">
        <UsernameLink
          username={person.username}
          displayName={person.name}
          avatarUrl={avatarUrl}
          role={person.role}
          roleContext={person.location}
          headline={person.headline}
          bio={person.bio}
          postsCount={person.posts}
          followersCount={person.followers}
          followingCount={person.following}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-border no-underline ring-1 ring-black/[0.04] sm:h-16 sm:w-16"
        >
          <Image
            src={avatarUrl}
            alt=""
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        </UsernameLink>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <UsernameLink
                username={person.username}
                displayName={person.name}
                avatarUrl={avatarUrl}
                role={person.role}
                roleContext={person.location}
                headline={person.headline}
                bio={person.bio}
                postsCount={person.posts}
                followersCount={person.followers}
                followingCount={person.following}
                className="block truncate text-[15px] font-bold leading-tight text-fg no-underline hover:underline"
              >
                {person.name}
              </UsernameLink>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-fg-muted">
                <Link href={profileHref} className="hover:underline">
                  @{person.username}
                </Link>
                <span aria-hidden>·</span>
                <span>{person.role}</span>
                <span aria-hidden>·</span>
                <span>{person.location}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleFollow}
              className={cn(
                "inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-[12px] font-bold transition-colors",
                isFollowing
                  ? "border border-border bg-bg text-fg hover:bg-hover"
                  : "border border-black bg-black text-white hover:bg-neutral-800"
              )}
            >
              {isFollowing ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.2} />
                  Following
                </>
              ) : (
                "Follow"
              )}
            </button>
          </div>

          <p className="mt-2 text-[13.5px] font-semibold leading-snug text-fg">
            {person.headline}
          </p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">
            {person.bio}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-fg-muted">
            <span>
              <strong className="font-bold text-fg">{formatCount(person.posts)}</strong> posts
            </span>
            <span>
              <strong className="font-bold text-fg">{formatCount(person.followers)}</strong> followers
            </span>
            <span className="truncate">{person.reason}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {person.knownFor.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-bg px-2 py-1 text-[11px] font-medium text-fg-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function PeopleSuggestionsPage() {
  const [activeRole, setActiveRole] = useState<PeopleSuggestionRole | "All">("All");
  const [followingByUsername, setFollowingByUsername] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        PEOPLE_SUGGESTIONS.map((person) => [person.username, Boolean(person.isFollowing)])
      )
  );

  const visiblePeople = useMemo(
    () =>
      activeRole === "All"
        ? PEOPLE_SUGGESTIONS
        : PEOPLE_SUGGESTIONS.filter((person) => person.role === activeRole),
    [activeRole]
  );

  return (
    <div className="mx-auto min-h-[calc(100vh-var(--site-header-sticky-offset,4.5rem))] w-full max-w-[860px] border-x border-border bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-4 py-4 backdrop-blur md:top-[var(--site-header-sticky-offset,4.5rem)] sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-fg">People suggestions</h1>
            <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-fg-muted">
              Filmmakers, critics, programmers, and obsessive viewers matched to your taste on 35mm.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-hover px-3 py-1.5 text-[12px] font-semibold text-fg-muted sm:inline-flex">
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
            {visiblePeople.length} shown
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {ROLE_FILTERS.map((role) => {
            const active = activeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRole(role)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-[12px] font-bold transition-colors",
                  active
                    ? "border-black bg-black text-white"
                    : "border-border bg-bg text-fg-muted hover:border-fg-muted hover:text-fg"
                )}
              >
                {role}
              </button>
            );
          })}
        </div>
      </header>

      <div>
        {visiblePeople.map((person) => (
          <SuggestionRow
            key={person.username}
            person={person}
            isFollowing={followingByUsername[person.username] === true}
            onToggleFollow={() =>
              setFollowingByUsername((current) => ({
                ...current,
                [person.username]: !current[person.username],
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}
