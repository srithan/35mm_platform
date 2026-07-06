"use client";

import Link from "next/link";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { StatBox } from "./StatBox";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GenreBreakdown } from "./GenreBreakdown";
import { DiaryRow } from "./DiaryRow";
import { formatCount } from "@/lib/utils/formatCount";
import { ROUTES } from "@/lib/constants/routes";
import { FavouriteFilms } from "./FavouriteFilms";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import { useProfileStats } from "../hooks/useProfile";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import type { ProfileTab } from "@/features/profile/lib/profileRoutes";
import { ProfileDiaryTimeline } from "./ProfileDiaryTimeline";
import { ProfileListsPanel } from "@/features/lists/components/ProfileListsPanel";

function formatMemberSince(value: string | null): string {
  if (!value) return "Member history unavailable";
  var dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Member history unavailable";
  return `Watching since ${dt.getUTCFullYear()}`;
}

function formatHoursSub(hours: number): string {
  if (hours <= 0) return "No runtime data yet";
  var days = Math.floor(hours / 24);
  if (days <= 0) return "< 1 day of screen time";
  return `≈ ${formatCount(days)} ${days === 1 ? "day" : "days"} of screen time`;
}

function formatAverageRating(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `✦ ${value.toFixed(1)}`;
}

function formatDiaryDate(iso: string): string {
  var dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(dt).toUpperCase();
}

export function ProfileTabContent({
  username,
  displayName,
  tab,
}: {
  username: string;
  displayName?: string;
  tab: ProfileTab;
}) {
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const { openComposerModal } = useComposerModal();
  const isOwnProfile = currentUser?.username === username;

  if (tab === "posts") {
    return (
      <InfinitePostList
        username={username}
        postTypes={["text", "discussion", "image", "log", "review"]}
        postFilter={function (post) {
          if (post.type !== "log" && post.type !== "review") return true;
          return post.visibility !== "private";
        }}
        emptyState={
          isOwnProfile
            ? {
                icon: <span className="text-[24px]">📝</span>,
                headline: "You haven't posted yet",
                primaryCta: {
                  label: "Write your first post",
                  onClick: openComposerModal,
                },
              }
            : {
                icon: <span className="text-[24px]">📝</span>,
                headline: `${displayName ?? username} hasn't posted yet`,
              }
        }
      />
    );
  }

  if (tab === "diary") {
    return (
      <ProfileDiaryTimeline
        username={username}
        displayName={displayName}
        isOwnProfile={isOwnProfile}
        onLogFilm={function () {
          openComposerModal(undefined, { initialMode: "log" });
        }}
      />
    );
  }

  if (tab === "lists") {
    return (
      <ProfileListsPanel username={username} displayName={displayName} isOwnProfile={isOwnProfile} />
    );
  }

  if (tab === "stats") {
    return <ProfileStatsTab username={username} displayName={displayName} />;
  }

  return null;
}

function ProfileStatsTab(props: { username: string; displayName?: string }) {
  var statsQuery = useProfileStats(props.username);

  if (statsQuery.isLoading) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
          {Array.from({ length: 4 }).map(function (_, index) {
            return (
              <div key={`stats-skeleton-${index}`} className="bg-bg p-6 px-10 animate-pulse">
                <div className="h-9 w-20 rounded bg-sunken-2" />
                <div className="mt-3 h-3 w-28 rounded bg-sunken-2" />
                <div className="mt-2 h-3 w-36 rounded bg-sunken-2" />
              </div>
            );
          })}
        </div>
        <div className="px-10 py-7 text-xs text-fg-muted">Loading stats...</div>
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-fg-muted">Couldn&apos;t load stats right now.</p>
        <button
          type="button"
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-[13px] font-medium text-fg hover:bg-hover"
          onClick={function () {
            void statsQuery.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  var stats = statsQuery.data;

  return (
    <div>
      <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
        <StatBox
          value={formatCount(stats.filmsLoggedCount)}
          label="Films logged"
          sub={formatMemberSince(stats.memberSince)}
        />
        <StatBox
          value={formatCount(stats.hoursWatched)}
          label="Hours watched"
          sub={formatHoursSub(stats.hoursWatched)}
        />
        <StatBox
          value={formatAverageRating(stats.averageRating)}
          label="Average rating"
          sub={stats.averageRating == null ? "No ratings yet" : "Across rated logs and reviews"}
          className="text-[32px]"
        />
        <StatBox
          value={formatCount(stats.reviewsWrittenCount)}
          label="Reviews written"
          sub={`${formatCount(stats.reviewLikeCount)} total ${stats.reviewLikeCount === 1 ? "like" : "likes"}`}
        />
      </div>
      <FavouriteFilms films={stats.favoriteFilms} />
      <ActivityHeatmap activity={stats.activity} />
      <GenreBreakdown genres={stats.genres} />
      <div className="py-5 px-10 border-b border-border">
        <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-1">
          Recent diary
        </div>
      </div>
      {stats.recentDiary.length === 0 ? (
        <div className="px-10 py-5 border-b border-border text-xs text-fg-muted">
          {props.displayName ?? props.username} hasn&apos;t logged any films yet
        </div>
      ) : (
        stats.recentDiary.map(function (entry) {
          var film = entry.film;
          var meta = [film.year ? String(film.year) : null, entry.type === "review" ? "Review" : "Log"]
            .filter(Boolean)
            .join(" · ");
          return (
            <DiaryRow
              key={entry.postId}
              date={formatDiaryDate(entry.createdAt)}
              title={film.title}
              meta={meta}
              posterSrc={film.posterUrl}
              imdbId={film.imdbId}
              rating={entry.rating}
            />
          );
        })
      )}
      <Link
        href={ROUTES.PROFILE_DIARY(props.username)}
        className="block py-8 text-center text-xs text-fg-muted cursor-pointer hover:text-fg transition-colors"
      >
        View full diary →
      </Link>
    </div>
  );
}
