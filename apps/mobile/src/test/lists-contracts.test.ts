import {
  parseFilmListDetail,
  parseFilmListPage,
} from "@/features/lists/contracts";

const OWNER = {
  id: "user-1",
  username: "maya",
  displayName: "Maya",
  avatarUrl: null,
  filmsLoggedCount: 12,
};

const LIST = {
  id: "list-1",
  userId: "user-1",
  type: "custom",
  title: "City Nights",
  description: "Neon and rain.",
  visibility: "public",
  isRanked: true,
  tags: ["noir"],
  shareSlug: "city-nights",
  likeCount: 9,
  commentCount: 2,
  entryCount: 1,
  isLiked: false,
  isOwner: false,
  createdAt: "2026-09-13T12:00:00.000Z",
  updatedAt: "2026-09-13T12:30:00.000Z",
  owner: OWNER,
  posterUrls: ["https://img.example/poster.jpg", null],
};

const ENTRY = {
  id: "entry-1",
  film: {
    id: "film-1",
    title: "Heat",
    year: 1995,
    posterUrl: null,
    genres: ["Crime"],
  },
  position: 1,
  note: "Coffee-shop gravity.",
  addedAt: "2026-09-13T12:10:00.000Z",
};

describe("mobile list contracts", () => {
  it("parses paginated list summaries", () => {
    expect(parseFilmListPage({
      items: [LIST],
      nextCursor: "next",
      hasMore: true,
    })).toMatchObject({
      items: [{ title: "City Nights", entryCount: 1 }],
      nextCursor: "next",
      hasMore: true,
    });
  });

  it("parses watchlist/list detail entries", () => {
    expect(parseFilmListDetail({
      ...LIST,
      type: "watchlist",
      title: "Watchlist",
      entries: [ENTRY],
      entriesPage: {
        items: [ENTRY],
        nextCursor: null,
        hasMore: false,
      },
      clonedFromListId: null,
    })).toMatchObject({
      title: "Watchlist",
      entries: [{ film: { title: "Heat" } }],
      entriesPage: { hasMore: false },
    });
  });

  it("rejects malformed counts", () => {
    expect(() => parseFilmListPage({
      items: [{ ...LIST, likeCount: -1 }],
      nextCursor: null,
      hasMore: false,
    })).toThrow("FilmListSummary.likeCount");
  });
});
