"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { ApiRequestError } from "@/features/feed/api/http";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { ROUTES } from "@/lib/constants/routes";
import { getMockPortraitUrlForUsername } from "@/lib/constants/mockPortraitUrl";
import { cn } from "@/lib/utils/cn";
import type { FollowSuggestion } from "@35mm/types";
import {
  usePeopleSuggestions,
  useSuggestionFollowMutation,
} from "../hooks/useSuggestions";

const SIGNAL_FILTERS: Array<FollowSuggestion["signalType"] | "All"> = [
  "All",
  "fof",
  "content_affinity",
  "letterboxd_import_match",
  "onboarding_seed",
];

const SIGNAL_LABELS: Record<FollowSuggestion["signalType"], string> = {
  fof: "Followed by people you follow",
  content_affinity: "Content affinity",
  letterboxd_import_match: "Imported taste",
  onboarding_seed: "Onboarding seed",
};

function signalFilterLabel(signalType: FollowSuggestion["signalType"] | "All") {
  if (signalType === "All") return "All";
  return SIGNAL_LABELS[signalType];
}

function SuggestionRow(props: {
  person: FollowSuggestion;
  isFollowing: boolean;
  isSubmitting: boolean;
  onToggleFollow: () => void;
}) {
  var person = props.person;
  var profileHref = ROUTES.PROFILE(person.user.username);
  var avatarUrl = person.user.avatarUrl ?? getMockPortraitUrlForUsername(person.user.username);
  var followLabel = props.isSubmitting
    ? "..."
    : props.isFollowing
      ? "Following"
      : "Follow";

  return (
    <article className="border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-hover/70 sm:px-5">
      <div className="flex gap-3.5">
        <UsernameLink
          username={person.user.username}
          displayName={person.user.displayName}
          avatarUrl={avatarUrl}
          role={SIGNAL_LABELS[person.signalType]}
          roleContext="35mm"
          headline={person.user.bio ?? ""}
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
                username={person.user.username}
                displayName={person.user.displayName}
                avatarUrl={avatarUrl}
                role={SIGNAL_LABELS[person.signalType]}
                roleContext="35mm"
                headline={person.user.bio ?? ""}
                className="block truncate text-[15px] font-bold leading-tight text-fg no-underline hover:underline"
              >
                {person.user.displayName}
              </UsernameLink>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-fg-muted">
                <Link href={profileHref} className="hover:underline">
                  @{person.user.username}
                </Link>
                <span aria-hidden>·</span>
                <span>{SIGNAL_LABELS[person.signalType]}</span>
                <span aria-hidden>·</span>
                <span>Signal {person.score}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={props.isSubmitting}
              onClick={props.onToggleFollow}
              className={cn(
                "inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-[12px] font-bold transition-colors disabled:opacity-60",
                props.isFollowing
                  ? "border border-border bg-bg text-fg hover:bg-hover"
                  : "border border-black bg-black text-white hover:bg-neutral-800"
              )}
            >
              {props.isFollowing ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.2} />
                  {followLabel}
                </>
              ) : (
                followLabel
              )}
            </button>
          </div>

          <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
            {person.user.bio ?? "Film-focused creator on 35mm."}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg">{person.signalLabel}</p>
        </div>
      </div>
    </article>
  );
}

export function PeopleSuggestionsPage() {
  var { isLoaded, isSignedIn } = useAuth();
  var [activeSignal, setActiveSignal] = useState<FollowSuggestion["signalType"] | "All">("All");
  var suggestionsQuery = usePeopleSuggestions({ limit: 50 });
  var followMutation = useSuggestionFollowMutation();

  var [followingByUserId, setFollowingByUserId] = useState<Record<string, boolean>>({});
  var [submittingByUserId, setSubmittingByUserId] = useState<Record<string, boolean>>({});

  var visiblePeople = useMemo(
    function () {
      var candidates = suggestionsQuery.data?.suggestions ?? [];
      return activeSignal === "All"
        ? candidates
        : candidates.filter(function (person) {
            return person.signalType === activeSignal;
          });
    },
    [activeSignal, suggestionsQuery.data?.suggestions]
  );

  var isComputing = Boolean(suggestionsQuery.data?.computing);
  var noDataMessage =
    !isLoaded
      ? "Loading account..."
      : !isSignedIn
        ? "Sign in to get people suggestions."
        : suggestionsQuery.isLoading || isComputing
          ? "We’re building your personalized suggestions. Pull the latest soon."
          : suggestionsQuery.isError
            ? suggestionsQuery.error instanceof ApiRequestError && suggestionsQuery.error.status === 503
              ? "Suggestions backend is temporarily unavailable."
              : "Could not load suggestions right now."
            : visiblePeople.length === 0
              ? "No suggestions available yet."
              : "";

  function onToggleFollow(person: FollowSuggestion) {
    var userId = person.user.id;
    var currentlyFollowing = Boolean(followingByUserId[userId]);
    var nextFollowing = !currentlyFollowing;
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
      { userId: userId, isFollowing: currentlyFollowing },
      {
        onError: function () {
          setFollowingByUserId(function (current) {
            return {
              ...current,
              [userId]: currentlyFollowing,
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
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-var(--site-header-sticky-offset,4.5rem))] w-full max-w-[640px] border-x border-border bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-4 py-4 backdrop-blur md:top-[var(--site-header-sticky-offset,4.5rem)] sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-fg">People suggestions</h1>
            <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-fg-muted">
              Film collaborators, viewers, and discoverers matched to your activity on 35mm.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-hover px-3 py-1.5 text-[12px] font-semibold text-fg-muted sm:inline-flex">
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
            {visiblePeople.length} shown
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {SIGNAL_FILTERS.map(function (signalType) {
            var active = activeSignal === signalType;
            return (
              <button
                key={signalType}
                type="button"
                onClick={function () {
                  setActiveSignal(signalType);
                }}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-[12px] font-bold transition-colors",
                  active
                    ? "border-black bg-black text-white"
                    : "border-border bg-bg text-fg-muted hover:border-fg-muted hover:text-fg"
                )}
              >
                {signalFilterLabel(signalType)}
              </button>
            );
          })}
        </div>
      </header>

      <div>
        {suggestionsQuery.isLoading || noDataMessage ? (
          <div className="px-4 py-8 text-sm text-fg-muted">{noDataMessage}</div>
        ) : (
          visiblePeople.map(function (person) {
            return (
              <SuggestionRow
                key={person.user.id}
                person={person}
                isFollowing={Boolean(followingByUserId[person.user.id])}
                isSubmitting={Boolean(submittingByUserId[person.user.id])}
                onToggleFollow={function () {
                  onToggleFollow(person);
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
