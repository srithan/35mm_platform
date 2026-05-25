"use client";

import { useQueryState } from "nuqs";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";
import { UserCard } from "@/components/UserCard";
import { StatBox } from "./StatBox";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GenreBreakdown } from "./GenreBreakdown";
import { FilmPoster } from "@/components/FilmPoster";
import { DiaryRow } from "./DiaryRow";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { formatCount } from "@/lib/utils/formatCount";
import { MOCK_PROFILE_CONNECTIONS } from "@/features/profile/data/mockConnections";
import { FavouriteFilms } from "./FavouriteFilms";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";

const LISTS = [
  { name: "Films That Changed How I Light", desc: "Cinematography studies that rewired my brain — every DP should see these before they pick up a camera.", count: "28 films · 1,204 saves · Public", posters: ["https://m.media-amazon.com/images/M/MV5BMjIxNTU4MzY4MF5BMl5BanBnXkFtZTgwNzY1MTU0MTE@._V1_FMjpg_UX800_.jpg", "https://m.media-amazon.com/images/M/MV5BNDc2NTM1MjktYmVhNS00YzQwLWE5NjctNWQ4NzEzZGY5ODI4XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg"] },
  { name: "Sundance 2025 — My Picks", desc: "Everything I watched at this year's festival, ranked from best to most interesting failure.", count: "17 films · 342 saves · Public", posters: [null, "https://m.media-amazon.com/images/M/MV5BZTE2MmFiYjYtMjVjNS00MGEyLWFjZmItMmUwMDAxMWRhNTYxXkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", null] },
  { name: "African Cinema I Keep Coming Back To", desc: "Personal collection of essential African films. Ongoing.", count: "54 films · Private", posters: [null, null, null] },
];

export function ProfileTabContent({
  username,
  displayName,
}: {
  username: string;
  displayName?: string;
}) {
  const [tab] = useQueryState("tab", { defaultValue: "posts" });
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const { openComposerModal } = useComposerModal();
  const isOwnProfile = currentUser?.username === username;

  if (tab === "posts") {
    return (
      <div className="w-full max-w-[640px] mx-auto xl:w-[640px] xl:max-w-[640px]">
        <InfinitePostList
          username={username}
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
      </div>
    );
  }

  if (tab === "diary") {
    return (
      <EmptyState
        size="lg"
        icon={<span className="text-[24px]">🎞️</span>}
        headline={
          isOwnProfile
            ? "No films logged yet"
            : `${displayName ?? username} hasn't logged any films yet`
        }
        primaryCta={
          isOwnProfile
            ? {
                label: "Log a film",
                onClick: openComposerModal,
              }
            : undefined
        }
      />
    );
  }

  if (tab === "lists") {
    return (
      <div>
        <div className="px-10 py-4 border-b border-border flex items-center justify-between">
          <span className="text-[13px] text-fg-muted">12 lists · 3 public</span>
          <Button variant="primary" className="text-[11px] py-1.5 px-3.5">+ New list</Button>
        </div>
        <div className="px-10 divide-y divide-border">
          {LISTS.map((list) => (
            <div key={list.name} className="py-5 flex gap-4">
              <div className="flex gap-2">
                {list.posters.map((src, i) => (
                  <div key={i} className="w-12 flex-shrink-0 -mr-2 last:mr-0 relative z-[3]">
                    <FilmPoster
                      src={src}
                      alt=""
                      size="list"
                      placeholderGradient="from-[#1a1a2e] to-[#3a3a6e]"
                      placeholderStrokeColor="rgba(255,255,255,0.3)"
                    />
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[15px] font-semibold">{list.name}</div>
                <div className="text-[13px] text-fg-light mt-1 leading-relaxed">{list.desc}</div>
                <div className="text-[11px] text-fg-muted mt-2">{list.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
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

  if (tab === "followers" || tab === "following") {
    const placeholder = tab === "followers" ? "Search followers…" : "Search following…";
    return (
      <div>
        <div className="px-10 py-3.5 border-b border-border">
          <input
            type="text"
            placeholder={placeholder}
            className="w-full border-none bg-transparent font-sans text-[16px] md:text-sm text-fg outline-none placeholder:text-fg-muted focus:border-b focus:border-fg-muted"
          />
        </div>
        <div className="px-10 py-2">
          {MOCK_PROFILE_CONNECTIONS.length === 0 ? (
            tab === "following" ? (
              <EmptyState
                size="md"
                icon={<span className="text-[22px]">👥</span>}
                headline={
                  isOwnProfile
                    ? "You're not following anyone yet"
                    : `${displayName ?? username} isn't following anyone yet`
                }
                primaryCta={
                  isOwnProfile
                    ? { label: "Find people", href: "/suggestions/people" }
                    : undefined
                }
              />
            ) : (
              <EmptyState
                size="md"
                icon={<span className="text-[22px]">✨</span>}
                headline={
                  isOwnProfile
                    ? "Nobody's following you yet — keep posting"
                    : `${displayName ?? username} doesn't have any followers yet`
                }
              />
            )
          ) : (
            MOCK_PROFILE_CONNECTIONS.map((u) => (
              <UserCard
                key={u.username}
                username={u.username}
                handle={`@${u.username}`}
                role={u.role}
                initial={u.initial}
                avatarBg={u.avatarBg}
                avatarColor={u.avatarColor}
                showFollowButton
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
