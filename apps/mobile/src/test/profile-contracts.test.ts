import {
  parseProfileConnectionsPage,
  parseProfileMediaPresign,
  parseProfileStats,
  parsePublicProfile,
} from "@/features/profile/contracts";

const PROFILE = {
  userId: "4b3c0a38-5ac5-47c3-a6af-c2a09a3e6f86",
  username: "toni",
  displayName: "Toni",
  bio: "Noir and melodrama.",
  avatarUrl: "https://cdn.35mm.test/avatar.jpg",
  avatarUrlLg: "https://cdn.35mm.test/avatar-lg.jpg",
  coverUrl: "https://cdn.35mm.test/cover.jpg",
  location: "Los Angeles",
  website: "https://toni.example",
  dateOfBirth: null,
  role: "Critic",
  roleContext: "Noir desk",
  headline: "Critic",
  headlineContext: "Noir desk",
  filmsLoggedCount: 42,
  followerCount: 1200,
  followingCount: 98,
  followState: "following",
  isPrivate: false,
  hasIncomingFollowRequest: false,
  hasPendingRequestToViewer: false,
  isMutedByViewer: false,
  isDeactivated: false,
  moderationStatus: "visible",
  createdAt: "2026-09-13T12:00:00.000Z",
};

const STATS = {
  username: "toni",
  selectedYear: null,
  availableYears: [2026],
  filmsLoggedCount: 42,
  hoursWatched: 88.5,
  runtimeKnownCount: 41,
  averageRating: 8.2,
  ratedCount: 40,
  uniqueFilmsCount: 39,
  rewatchCount: 3,
  thisYearCount: 22,
  reviewsWrittenCount: 11,
  reviewLikeCount: 90,
  memberSince: "2026-01-01T00:00:00.000Z",
  favoriteFilms: [{
    id: "film-1",
    tmdbId: 603,
    imdbId: "tt0133093",
    title: "The Matrix",
    year: 1999,
    posterUrl: null,
  }],
  genres: [{ name: "Drama", count: 18, percentage: 42.8 }],
  activity: [{ date: "2026-09-13", count: 2 }],
  ratingDistribution: [{ rating: 8, count: 4 }],
  decades: [{ decade: 1990, count: 8 }],
  directors: [{ name: "Claire Denis", count: 3 }],
  artists: [{ name: "Maggie Cheung", count: 2 }],
  musicDirectors: [{ name: "Jonny Greenwood", count: 2 }],
  countries: [{ name: "France", count: 5 }],
  languages: [{ name: "French", count: 4 }],
  mostWatchedFilms: [{
    id: "film-2",
    tmdbId: null,
    imdbId: null,
    title: "Heat",
    year: 1995,
    posterUrl: null,
    watches: 3,
  }],
  cachedAt: "2026-09-13T12:30:00.000Z",
};

describe("mobile profile contracts", () => {
  it("parses profile detail and stats payloads", () => {
    expect(parsePublicProfile(PROFILE)).toMatchObject({
      username: "toni",
      followState: "following",
      followerCount: 1200,
    });
    expect(parseProfileStats(STATS)).toMatchObject({
      username: "toni",
      averageRating: 8.2,
      favoriteFilms: [{ id: "film-1", title: "The Matrix" }],
    });
  });

  it("parses cursor-paginated profile connections", () => {
    expect(parseProfileConnectionsPage({
      items: [{
        userId: "86f221e9-50b0-4f5c-9e4e-57c47e0c7e8c",
        username: "maya",
        displayName: "Maya",
        avatarUrl: null,
        avatarUrlLg: null,
        bio: null,
        followedAt: "2026-09-13T12:00:00.000Z",
        followState: "none",
      }],
      nextCursor: "cursor-1",
      hasMore: true,
      viewerOwnsProfile: false,
    })).toMatchObject({
      hasMore: true,
      items: [{ username: "maya" }],
    });
  });

  it("rejects invalid counters and media URLs", () => {
    expect(() => parsePublicProfile({ ...PROFILE, followerCount: -1 }))
      .toThrow("PublicProfile.followerCount");
    expect(() => parseProfileMediaPresign({
      uploadUrl: "ftp://example.test/upload",
      publicUrl: "https://cdn.35mm.test/avatar.jpg",
      contentType: "image/jpeg",
      expiresInSeconds: 300,
    })).toThrow("ProfileMediaPresign.uploadUrl");
  });
});
