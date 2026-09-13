import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Post } from "@/features/feed/types/feed";
import { RICH_TEXT_PREFIX } from "@/lib/utils/richContent";
import { ProfileDiaryTimeline } from "./ProfileDiaryTimeline";

const mocks = vi.hoisted(function () {
  return { posts: [] as Post[], useFeed: vi.fn() };
});

const richBody =
  RICH_TEXT_PREFIX +
  JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Now Watching" }],
      },
    ],
  });

const diaryPost: Post = {
  id: "post-1",
  author: {
    id: "user-1",
    username: "srithan",
    displayName: "Srithan",
    avatarUrl: null,
    isFollowing: false,
  },
  type: "log",
  body: richBody,
  media: [],
  film: {
    id: "01J00000000000000000000000",
    tmdbId: 101,
    title: "The Farm",
    year: 2019,
    posterUrl: null,
    genres: ["Horror"],
    rating: 3,
  },
  likeCount: 0,
  commentCount: 0,
  repostCount: 0,
  bookmarkCount: 0,
  quoteCount: 0,
  isLiked: false,
  isReposted: false,
  isBookmarked: false,
  repostContext: null,
  createdAt: "2026-07-11T12:00:00.000Z",
  updatedAt: "2026-07-11T12:00:00.000Z",
};

vi.mock("@/features/feed/hooks/useFeed", function () {
  return {
    useFeed: function (username: string, kind: string) {
      mocks.useFeed(username, kind);
      return {
        data: { pages: [{ posts: mocks.posts }] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        status: "success",
      };
    },
  };
});

vi.mock("@/components/FilmPoster", function () {
  return {
    FilmPoster: function ({ alt }: { alt: string }) {
      return <span role="img" aria-label={alt} />;
    },
  };
});

describe("ProfileDiaryTimeline", function () {
  it("renders stored rich-text diary notes without exposing serialization", function () {
    mocks.posts = [diaryPost];

    render(
      <ProfileDiaryTimeline
        username="srithan"
        displayName="Srithan"
        isOwnProfile
        onLogFilm={vi.fn()}
      />
    );

    expect(screen.getByText("Now Watching")).toBeInTheDocument();
    expect(screen.queryByText(/35MM_RICH_TEXT_V1/)).not.toBeInTheDocument();
    const stars = screen.getByRole("img", { name: "3 out of 5 stars" });
    expect(stars.firstElementChild).toHaveClass("h-3.5", "w-3.5");
    expect(screen.queryByText("3.0")).not.toBeInTheDocument();
  });

  it("uses the watched date for month, day, and weekday without timezone drift", function () {
    mocks.posts = [{
      ...diaryPost,
      watchedOn: "2026-07-01",
      isRewatch: true,
      createdAt: "2026-09-13T02:00:00.000Z",
    }];

    render(
      <ProfileDiaryTimeline username="srithan" isOwnProfile onLogFilm={vi.fn()} />
    );

    expect(mocks.useFeed).toHaveBeenLastCalledWith("srithan", "diary");
    expect(screen.getByRole("heading", { name: "July 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "September 2026" })).not.toBeInTheDocument();
    const entry = screen.getByRole("article");
    expect(within(entry).getByText("WED")).toBeInTheDocument();
    expect(within(entry).getByText("01")).toBeInTheDocument();
    expect(entry.querySelector("time")).toHaveAttribute("datetime", "2026-07-01");
    expect(within(entry).getByText("2019 · Rewatch · Log")).toBeInTheDocument();
  });

  it("uses the legacy posting date in UTC to match server diary ordering", function () {
    mocks.posts = [{
      ...diaryPost,
      watchedOn: null,
      createdAt: "2026-07-01T00:30:00.000Z",
    }];

    render(
      <ProfileDiaryTimeline username="srithan" isOwnProfile onLogFilm={vi.fn()} />
    );

    expect(screen.getByRole("heading", { name: "July 2026" })).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByRole("article").querySelector("time")).toHaveAttribute("datetime", "2026-07-01");
    expect(screen.queryByText(/Rewatch/)).not.toBeInTheDocument();
  });
});
