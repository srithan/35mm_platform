"use client";

import Link from "next/link";
import {
  AlignLeft,
  Check,
  ChevronRight,
  ImageIcon,
  MapPin,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ProfileCompletionState } from "@/features/profile/api/profileApi";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import type { ProfileEditTarget } from "@/features/profile/lib/profileEditTargets";
import { ROUTES } from "@/lib/constants/routes";

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
    description: "Help people recognize you",
    icon: UserRound,
  },
  {
    target: "cover",
    label: "Cover photo",
    description: "Set the tone for your page",
    icon: ImageIcon,
  },
  {
    target: "bio",
    label: "Bio",
    description: "Share what you watch or make",
    icon: AlignLeft,
  },
  {
    target: "location",
    label: "Location",
    description: "Connect with people nearby",
    icon: MapPin,
  },
];

function completionValue(completion: ProfileCompletionState, item: CompletionItem): boolean {
  return completion[item.target];
}

function completionHref(username: string, target: ProfileEditTarget): string {
  return ROUTES.PROFILE(username) + "?editProfile=" + encodeURIComponent(target);
}

function ProgressRing(props: { percent: number; size?: number }) {
  var size = props.size ?? 52;
  var stroke = 4;
  var radius = (size - stroke) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference - (props.percent / 100) * circumference;
  var center = size / 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="Profile completion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={props.percent}
    >
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--color-film-red) 14%, var(--sunken))"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-film-red)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-film-red">
        {props.percent}%
      </span>
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
    <div className="mb-4 rounded-2xl shadow-[0_2px_12px_rgba(15,15,15,0.06)]">
      <section
        aria-labelledby="profile-completion-title"
        className="overflow-hidden rounded-2xl border border-border bg-bg"
      >
        <div className="border-b border-[color-mix(in_srgb,var(--color-film-red)_14%,var(--border))] bg-[color-mix(in_srgb,var(--color-film-red)_5%,var(--bg))] px-4 py-4">
        <div className="flex items-center gap-3.5">
          <ProgressRing percent={percent} />
          <div className="min-w-0 flex-1">
            <h2
              id="profile-completion-title"
              className="text-[15px] font-bold leading-tight tracking-tight text-fg"
            >
              Finish your profile
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-fg-muted">
              {remainingCount === 1
                ? "One detail left — complete profiles are easier to discover."
                : completedCount === 0
                  ? "Four quick details help people know who they're following."
                  : remainingCount + " details left — you're almost there."}
            </p>
          </div>
        </div>
      </div>

      <ul className="m-0 list-none px-2.5 py-2.5">
        {COMPLETION_ITEMS.map(function (item) {
          var isComplete = completionValue(props.completion, item);
          var Icon = item.icon;

          if (isComplete) {
            return (
              <li
                key={item.target}
                className="flex min-h-[48px] items-center gap-3 rounded-lg px-2 py-2"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-film-red)_10%,var(--elevated))] text-film-red">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold leading-4 text-fg-muted">
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
                className="group flex min-h-[56px] items-center gap-3 rounded-xl px-2 py-2.5 outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-sunken focus-visible:bg-sunken focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-film-red/25 active:translate-y-px motion-reduce:transition-none"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-elevated text-fg-muted transition-colors duration-150 group-hover:border-[color-mix(in_srgb,var(--color-film-red)_20%,var(--border))] group-hover:text-film-red motion-reduce:transition-none">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold leading-4 text-fg">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] leading-4 text-fg-muted">
                    {item.description}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-fg-faint transition-[color,transform] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-film-red motion-reduce:transition-none"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
      </section>
    </div>
  );
}
