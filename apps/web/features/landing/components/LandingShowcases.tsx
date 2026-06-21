"use client";

import Image from "next/image";
import { Heart, MessageCircle, Repeat2, Bookmark } from "lucide-react";
import { FilmCard } from "@/components/FilmCard";
import { cn } from "@/lib/utils/cn";

type ShowcasePost = {
  id: string;
  variant: "film-log" | "discussion" | "text";
  displayName: string;
  handle: string;
  timestamp: string;
  avatarInitial: string;
  avatarBg: string;
  avatarColor: string;
  avatarUrl?: string;
  headline?: string;
  text: string;
  filmCard?: {
    title: string;
    year: number;
    genre?: string;
    posterUrl?: string | null;
    rating?: number;
  };
  likeCount: number;
  commentCount: number;
  role?: string;
};

const SHOWCASE_POSTS: ShowcasePost[] = [
  {
    id: "showcase-1",
    variant: "film-log",
    displayName: "Maya Okonkwo",
    handle: "@maya.frames",
    timestamp: "2h",
    avatarInitial: "M",
    avatarBg: "linear-gradient(135deg,#2d3a4a,#1a2530)",
    avatarColor: "#adb8c4",
    text: "Finally watched Jeanne Dielman in its entirety. The horror is in the routine — nothing prepares you for the final act.",
    filmCard: {
      title: "Jeanne Dielman, 23 quai du Commerce",
      year: 1975,
      genre: "Drama",
      posterUrl: null,
      rating: 10,
    },
    likeCount: 84,
    commentCount: 17,
    role: "Director",
  },
  {
    id: "showcase-2",
    variant: "discussion",
    displayName: "James Pellicola",
    handle: "@j.pellicola",
    timestamp: "5h",
    avatarInitial: "J",
    avatarBg: "linear-gradient(135deg,#0f1e2a,#1a2838)",
    avatarColor: "#8eb4d4",
    headline: "Did Oppenheimer earn its runtime?",
    text: "Genuinely curious where people land on this. I loved the courtroom framing but the final act lost me.",
    likeCount: 142,
    commentCount: 89,
    role: "Critic",
  },
  {
    id: "showcase-3",
    variant: "film-log",
    displayName: "Lena Montage",
    handle: "@lena.montage",
    timestamp: "8h",
    avatarInitial: "L",
    avatarBg: "linear-gradient(135deg,#2e1f3a,#1a1a2e)",
    avatarColor: "#b08fcc",
    text: "Fourth watch. Still don't fully understand it. Still think that's the point.",
    filmCard: {
      title: "Mulholland Drive",
      year: 2001,
      genre: "Mystery",
      posterUrl: null,
      rating: 8,
    },
    likeCount: 213,
    commentCount: 58,
  },
];

function ShowcaseActions({ likes, comments }: { likes: number; comments: number }) {
  return (
    <div className="mt-3 flex items-center gap-5 text-fg-muted">
      <span className="inline-flex items-center gap-1.5 text-[13px]">
        <Heart className="h-[15px] w-[15px]" strokeWidth={1.75} />
        {likes}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[13px]">
        <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.75} />
        {comments}
      </span>
      <Repeat2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
      <Bookmark className="ml-auto h-[15px] w-[15px]" strokeWidth={1.75} />
    </div>
  );
}

function ShowcasePostRow({ post, className }: { post: ShowcasePost; className?: string }) {
  return (
    <article className={cn("border-b border-border px-4 py-4 last:border-b-0", className)}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold"
          style={{ background: post.avatarBg, color: post.avatarColor }}
        >
          {post.avatarInitial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[13.5px] font-bold text-fg">{post.displayName}</span>
            <span className="text-[13.5px] text-fg-muted">{post.handle}</span>
            <span className="text-xs text-fg-muted">· {post.timestamp}</span>
            {post.variant === "film-log" ? (
              <span className="text-[11px] text-fg-muted">logged a film</span>
            ) : null}
            {post.role ? (
              <span className="rounded-full border border-border bg-sunken px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-fg-muted">
                {post.role}
              </span>
            ) : null}
          </div>

          {post.variant === "discussion" && post.headline ? (
            <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-fg">
              {post.headline}
            </h3>
          ) : null}

          <p className="mt-2 text-[15px] leading-[1.6] text-fg">{post.text}</p>

          {post.filmCard ? (
            <div className="mt-3">
              <FilmCard
                title={post.filmCard.title}
                year={post.filmCard.year}
                genre={post.filmCard.genre}
                posterUrl={post.filmCard.posterUrl ?? undefined}
                rating={post.filmCard.rating}
              />
            </div>
          ) : null}

          <ShowcaseActions likes={post.likeCount} comments={post.commentCount} />
        </div>
      </div>
    </article>
  );
}

export function LandingFeedShowcase({ variant = "default" }: { variant?: "default" | "hero" }) {
  var isHero = variant === "hero";

  return (
    <div
      className={
        "landing-feed-preview relative overflow-hidden bg-bg " +
        (isHero
          ? "landing-feed-preview--hero rounded-[1.35rem] border border-black/[0.08]"
          : "rounded-[1.75rem] border border-border shadow-[0_40px_100px_-24px_rgba(15,15,15,0.18)]")
      }
    >
      <div className="flex items-center gap-2 border-b border-border bg-white px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden />
        <span className="mx-auto text-[11px] font-medium tracking-[0.04em] text-fg-muted">35mm.in · Home</span>
      </div>
      <div className={"relative overflow-hidden " + (isHero ? "max-h-[580px]" : "max-h-[520px]")}>
        {SHOWCASE_POSTS.map(function (post, index) {
          return (
            <ShowcasePostRow
              key={post.id}
              post={post}
              className={index === 2 ? "opacity-70" : undefined}
            />
          );
        })}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg via-bg/90 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function LandingProfileShowcase() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-bg shadow-[0_32px_80px_-24px_rgba(15,15,15,0.14)]">
      <div className="relative h-[7.5rem] overflow-hidden sm:h-[9rem]">
        <Image
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=80"
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" aria-hidden />
      </div>
      <div className="relative px-4 pb-5 pt-0">
        <div
          className="-mt-8 flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border-[3px] border-bg bg-gradient-to-br from-[#2d3a4a] to-[#1a2530] font-display text-xl font-semibold text-[#adb8c4]"
        >
          M
        </div>
        <div className="mt-3">
          <h3 className="text-lg font-bold tracking-tight text-fg">Maya Okonkwo</h3>
          <p className="text-sm text-fg-muted">@maya.frames · Director · London</p>
        </div>
        <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-fg">
          Documentary filmmaker. Currently in post on a Berlinale short. Always logging, rarely satisfied.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["248", "films logged"],
            ["1.2k", "followers"],
            ["384", "following"],
          ].map(function (pair) {
            return (
              <div
                key={pair[1]}
                className="rounded-lg border border-border bg-white px-3 py-2 shadow-[0_1px_0_rgb(15_23_42/4%)]"
              >
                <div className="text-[16px] font-semibold tabular-nums text-fg">{pair[0]}</div>
                <div className="text-[11px] text-fg-muted">{pair[1]}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-fg-muted">Favourites</p>
          <div className="mt-2 flex gap-2">
            {["#0f1923", "#2c1810", "#1a2530", "#2e1f3a"].map(function (tone, index) {
              return (
                <div
                  key={tone}
                  className="aspect-[2/3] w-[3.25rem] rounded-md border border-border"
                  style={{ background: "linear-gradient(160deg," + tone + ",#0a0a0a)" }}
                  aria-hidden
                >
                  <span className="sr-only">Favourite film poster {index + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
