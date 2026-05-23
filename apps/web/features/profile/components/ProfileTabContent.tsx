"use client";

import { useQueryState } from "nuqs";
import { PostCard } from "@/features/feed/components/PostCard";
import { StarRating } from "@/components/StarRating";
import { UserCard } from "@/components/UserCard";
import { StatBox } from "./StatBox";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { GenreBreakdown } from "./GenreBreakdown";
import { FilmPoster } from "@/components/FilmPoster";
import { DiaryRow } from "./DiaryRow";
import { Button } from "@/components/Button";
import { formatCount } from "@/lib/utils/formatCount";
import { MOCK_PROFILE_CONNECTIONS } from "@/features/profile/data/mockConnections";
import { getMockPortraitUrlForUsername } from "@/lib/constants/mockPortraitUrl";
import { FavouriteFilms } from "./FavouriteFilms";

const LISTS = [
  { name: "Films That Changed How I Light", desc: "Cinematography studies that rewired my brain — every DP should see these before they pick up a camera.", count: "28 films · 1,204 saves · Public", posters: ["https://m.media-amazon.com/images/M/MV5BMjIxNTU4MzY4MF5BMl5BanBnXkFtZTgwNzY1MTU0MTE@._V1_FMjpg_UX800_.jpg", "https://m.media-amazon.com/images/M/MV5BNDc2NTM1MjktYmVhNS00YzQwLWE5NjctNWQ4NzEzZGY5ODI4XkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg"] },
  { name: "Sundance 2025 — My Picks", desc: "Everything I watched at this year's festival, ranked from best to most interesting failure.", count: "17 films · 342 saves · Public", posters: [null, "https://m.media-amazon.com/images/M/MV5BZTE2MmFiYjYtMjVjNS00MGEyLWFjZmItMmUwMDAxMWRhNTYxXkEyXkFqcGc@._V1_FMjpg_UX800_.jpg", null] },
  { name: "African Cinema I Keep Coming Back To", desc: "Personal collection of essential African films. Ongoing.", count: "54 films · Private", posters: [null, null, null] },
];

export function ProfileTabContent({ username, displayName }: { username: string; displayName?: string }) {
  const postAuthorName = displayName ?? username.charAt(0).toUpperCase() + username.slice(1);
  const profileMockAvatarUrl = getMockPortraitUrlForUsername(username);
  const [tab] = useQueryState("tab", { defaultValue: "posts" });

  if (tab === "posts") {
    return (
      <div className="w-full max-w-[640px] mx-auto xl:w-[640px] xl:max-w-[640px]">
        <PostCard
          postId="p1"
          variant="text"
          username={username}
          displayName={postAuthorName}
          handle={`@${username}`}
          timestamp="3 days ago"
          avatarInitial="M"
          avatarUrl={profileMockAvatarUrl}
          avatarBg="linear-gradient(135deg,#2a1a2e,#8a4a6a)"
          avatarColor="#fff"
          text="Finally finished editing Ashes and Embers. Four years, three countries, two blown budgets, one film. The grain structure in the final reel makes everything worth it."
          imageSrc="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=700&q=75"
          likeCount={2341}
          liked
          commentCount={187}
        />
        <PostCard
          postId="p2"
          variant="text"
          username={username}
          displayName={postAuthorName}
          handle={`@${username}`}
          timestamp="5 days ago"
          avatarInitial="M"
          avatarUrl={profileMockAvatarUrl}
          avatarBg="linear-gradient(135deg,#2a1a2e,#8a4a6a)"
          avatarColor="#fff"
          text="The difference between shooting on 16mm and digital isn't just aesthetic — it changes how your whole crew moves. Everyone slows down."
          likeCount={892}
          commentCount={74}
        />
        <PostCard
          postId="p3"
          variant="film-log"
          username={username}
          displayName={postAuthorName}
          handle={`@${username}`}
          timestamp="5 days ago"
          avatarInitial="M"
          avatarUrl={profileMockAvatarUrl}
          avatarBg="linear-gradient(135deg,#2a1a2e,#8a4a6a)"
          avatarColor="#fff"
          text="Sean Baker doing what he does best — humanising the margins. The handheld work in the final act is extraordinary."
          filmCard={{ title: "Anora", meta: "Sean Baker · 2024 · Drama", posterSrc: "https://www.movieposters.com/cdn/shop/files/anora_zsv5lb9d_1024x1024.jpg?v=1762977642", imdbId: "tt30187306", rating: 5 }}
          likeCount={1102}
          commentCount={98}
        />
        <div className="py-10 text-center text-xs text-fg-muted cursor-pointer hover:text-fg transition-colors">
          Load more ↓
        </div>
      </div>
    );
  }

  if (tab === "reviews") {
    return (
      <div className="px-10">
        {[
          { title: "The Brutalist", meta: "Brady Corbet · 2024", poster: "https://m.media-amazon.com/images/M/MV5BM2U0MWRjZTMtMDVhNC00MzY4LTgwOTktZGQ2MDdiYTI4OWMxXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg", imdbId: "tt33451484", rating: 4, body: "A film about the cost of vision. Corbet understands something most directors never learn: that the camera itself must carry the weight of what it witnesses.", date: "Jan 14, 2025", likes: 841 },
          { title: "Anora", meta: "Sean Baker · 2024", poster: "https://www.movieposters.com/cdn/shop/files/anora_zsv5lb9d_1024x1024.jpg?v=1762977642", imdbId: "tt30187306", rating: 5, body: "Baker shoots chaos the way only someone who loves their subjects can — never condescending, always alive to the next surprise.", date: "Feb 3, 2025", likes: 1204 },
        ].map((r) => (
          <div key={r.title} className="py-5 border-b border-border">
            <div className="flex gap-4">
              <div className="w-14 flex-shrink-0">
                <FilmPoster src={r.poster} imdbId={r.imdbId} alt={r.title} size="review" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base font-semibold">{r.title}</div>
                <div className="text-[11.5px] text-fg-muted mt-0.5">{r.meta}</div>
                <div className="mt-2"><StarRating rating={r.rating} size="sm" /></div>
              </div>
            </div>
            <p className="text-sm leading-[1.65] text-fg mt-3">{r.body}</p>
            <div className="flex gap-4 mt-3 text-[11px] text-fg-muted">
              <span>{r.date}</span>
              <span>{formatCount(r.likes)} likes</span>
              <span className="text-accent cursor-pointer">Read full review →</span>
            </div>
          </div>
        ))}
        <div className="py-10 text-center text-xs text-fg-muted cursor-pointer hover:text-fg transition-colors">
          Load more ↓
        </div>
      </div>
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
          {MOCK_PROFILE_CONNECTIONS.map((u) => (
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
          ))}
        </div>
      </div>
    );
  }

  return null;
}
