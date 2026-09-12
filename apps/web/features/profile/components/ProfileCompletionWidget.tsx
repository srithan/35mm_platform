"use client";

import Link from "next/link";
import {
  AlignLeft,
  Check,
  Clapperboard,
  ImageIcon,
  MapPin,
  Plus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ProfileCompletionState } from "@/features/profile/api/profileApi";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import type { ProfileEditTarget } from "@/features/profile/lib/profileEditTargets";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type CompletionItem = {
  target: ProfileEditTarget;
  label: string;
  description: string;
  icon: LucideIcon;
};

const COMPLETION_ITEMS: CompletionItem[] = [
  {
    target: "avatar",
    label: "Profile photo",
    description: "Put a face to your takes",
    icon: UserRound,
  },
  {
    target: "cover",
    label: "Cover photo",
    description: "Set the mood on your page",
    icon: ImageIcon,
  },
  {
    target: "bio",
    label: "Bio",
    description: "What do you love watching?",
    icon: AlignLeft,
  },
  {
    target: "location",
    label: "Location",
    description: "Find film folks near you",
    icon: MapPin,
  },
];

const FILM_RED_TINT_BG = "bg-[color-mix(in_srgb,var(--color-film-red)_9%,var(--bg))]";
const FILM_RED_TINT_TRACK = "bg-[color-mix(in_srgb,var(--color-film-red)_14%,var(--sunken))]";
const FILM_RED_TINT_BORDER = "border-[color-mix(in_srgb,var(--color-film-red)_22%,var(--border))]";

function completionValue(completion: ProfileCompletionState, item: CompletionItem): boolean {
  return completion[item.target];
}

function completionHref(username: string, target: ProfileEditTarget): string {
  return ROUTES.PROFILE(username) + "?editProfile=" + encodeURIComponent(target);
}

function headerCopy(completedCount: number, remainingCount: number): string {
  if (completedCount === 0) return "Four quick things so people know who they're following.";
  if (remainingCount === 1) return "One more and you're all set — nearly there!";
  return "You're on a roll. " + remainingCount + " more to go.";
}

/** One rounded frame per setup step — a little film strip that fills in as you go. */
function ProgressFrames(props: { completed: number; total: number; percent: number }) {
  var frames: number[] = [];
  for (var index = 0; index < props.total; index += 1) {
    frames.push(index);
  }

  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-label="Profile completion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={props.percent}
    >
      {frames.map(function (index) {
        var isFilled = index < props.completed;
        return (
          <span
            key={index}
            aria-hidden
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300 ease-out motion-reduce:transition-none",
              isFilled ? "bg-film-red" : FILM_RED_TINT_TRACK
            )}
          />
        );
      })}
    </div>
  );
}

export function ProfileCompletionWidget() {
  var currentUserQuery = useCurrentUserProfile();
  var profile = currentUserQuery.data;
  var completion = profile?.profileCompletion;

  if (!profile || !completion) return null;

  return <ProfileCompletionCard username={profile.username} completion={completion} />;
}

export function ProfileCompletionCard(props: {
  username: string;
  completion: ProfileCompletionState;
}) {
  var completedCount = COMPLETION_ITEMS.filter(function (item) {
    return completionValue(props.completion, item);
  }).length;

  if (completedCount === COMPLETION_ITEMS.length) return null;

  var percent = Math.round((completedCount / COMPLETION_ITEMS.length) * 100);
  var remainingCount = COMPLETION_ITEMS.length - completedCount;

  return (
    <section
      aria-labelledby="profile-completion-title"
      className="mb-4 overflow-hidden rounded-2xl border border-border bg-bg shadow-sm"
    >
      <header className={cn("px-4 pb-4 pt-4", FILM_RED_TINT_BG)}>
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-film-red shadow-sm"
          >
            <Clapperboard className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="profile-completion-title"
              className="font-display text-[20px] font-semibold leading-tight text-fg"
            >
              Set the scene
            </h2>
            <p className="mt-1 text-[12.5px] leading-snug text-fg-muted">
              {headerCopy(completedCount, remainingCount)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <ProgressFrames
              completed={completedCount}
              total={COMPLETION_ITEMS.length}
              percent={percent}
            />
          </div>
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-fg-muted">
            {completedCount} of {COMPLETION_ITEMS.length}
          </span>
        </div>
      </header>

      <ul className="m-0 list-none space-y-0.5 p-2">
        {COMPLETION_ITEMS.map(function (item) {
          var isComplete = completionValue(props.completion, item);
          var Icon = item.icon;

          if (isComplete) {
            return (
              <li key={item.target} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-film-red",
                    FILM_RED_TINT_BG
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold leading-4 text-fg-muted line-through decoration-fg-faint decoration-1">
                    {item.label}
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.target}>
              <Link
                href={completionHref(props.username, item.target)}
                aria-label={"Add " + item.label.toLowerCase()}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors duration-150 ease-out hover:bg-sunken focus-visible:bg-sunken focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-film-red/30 motion-reduce:transition-none"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-fg-muted transition-colors duration-150 group-hover:text-film-red motion-reduce:transition-none">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold leading-4 text-fg">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] leading-4 text-fg-muted">
                    {item.description}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border bg-bg pl-2 pr-2.5 text-[12px] font-semibold text-film-red transition-colors duration-150 group-hover:bg-film-red group-hover:text-white motion-reduce:transition-none",
                    FILM_RED_TINT_BORDER,
                    "group-hover:border-film-red"
                  )}
                >
                  <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                  Add
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
