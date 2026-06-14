"use client";

import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { StatBox } from "./StatBox";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GenreBreakdown } from "./GenreBreakdown";
import { DiaryRow } from "./DiaryRow";
import { formatCount } from "@/lib/utils/formatCount";
import { FavouriteFilms } from "./FavouriteFilms";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import type { ProfileTab } from "@/features/profile/lib/profileRoutes";
import { ProfileDiaryTimeline } from "./ProfileDiaryTimeline";
import { ProfileListsPanel } from "@/features/lists/components/ProfileListsPanel";

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
    return (
      <div>
        <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
          <StatBox value="642" label="Films logged" sub="Watching since 2019" />
          <StatBox value="1,284" label="Hours watched" sub="≈ 53 days of your life" />
          <StatBox value="✦ 3.9" label="Average rating" sub="You rate generously" className="text-[32px]" />
          <StatBox value="47" label="Reviews written" sub={`${formatCount(2847)} total likes`} />
        </div>
        <FavouriteFilms />
        <ActivityHeatmap />
        <GenreBreakdown />
        <div className="py-5 px-10 border-b border-border">
          <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-1">
            Recent diary
          </div>
        </div>
        <DiaryRow date="FEB 18" title="Anora" meta="Sean Baker · 2024 · 1st watch" posterSrc="https://www.movieposters.com/cdn/shop/files/anora_zsv5lb9d_1024x1024.jpg?v=1762977642" imdbId="tt30187306" rating={5} />
        <DiaryRow date="FEB 14" title="The Brutalist" meta="Brady Corbet · 2024 · 2nd watch" posterSrc="https://m.media-amazon.com/images/M/MV5BM2U0MWRjZTMtMDVhNC00MzY4LTgwOTktZGQ2MDdiYTI4OWMxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" imdbId="tt33451484" rating={4} />
        <DiaryRow date="FEB 10" title="Mulholland Drive" meta="David Lynch · 2001 · 7th watch" posterSrc="https://m.media-amazon.com/images/M/MV5BMjIxNTU4MzY4MF5BMl5BanBnXkFtZTgwNzY1MTU0MTE@._V1_FMjpg_UX800_.jpg" imdbId="tt0166924" rating={5} />
        <DiaryRow date="FEB 7" title="Nickel Boys" meta="RaMell Ross · 2024 · 1st watch" imdbId="tt32699266" rating={5} />
        <div className="py-8 text-center text-xs text-fg-muted cursor-pointer hover:text-fg transition-colors">
          View full diary →
        </div>
      </div>
    );
  }

  return null;
}
