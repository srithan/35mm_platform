import { ApiRequestError, apiRequest } from "@/features/feed/api/http";
import { resolveProfileMediaUrls } from "@/lib/utils/r2Media";

export type FollowState = "none" | "requested" | "following" | "self";

export interface PublicProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  coverUrl: string | null;
  location: string | null;
  website: string | null;
  dateOfBirth: string | null;
  role: string | null;
  roleContext: string | null;
  headline?: string | null;
  headlineContext?: string | null;
  filmsLoggedCount: number;
  followerCount: number;
  followingCount: number;
  followState: FollowState;
  isPrivate: boolean;
  hasIncomingFollowRequest?: boolean;
  hasPendingRequestToViewer?: boolean;
  isMutedByViewer?: boolean;
  isDeactivated: boolean;
  createdAt?: string;
}

export interface CurrentUserProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  role: string | null;
  roleContext: string | null;
  filmsLoggedCount: number;
}

export interface ProfileStatsFilm {
  id: string;
  tmdbId: number | null;
  imdbId: string | null;
  title: string;
  year: number | null;
  posterUrl: string | null;
}

export interface ProfileStatsGenre {
  name: string;
  count: number;
  percentage: number;
}

export interface ProfileStatsActivityDay {
  date: string;
  count: number;
}

export interface ProfileStatsDiaryEntry {
  postId: string;
  type: "log" | "review";
  createdAt: string;
  rating: number | null;
  film: ProfileStatsFilm;
}

export interface ProfileStatsSummary {
  username: string;
  filmsLoggedCount: number;
  hoursWatched: number;
  averageRating: number | null;
  reviewsWrittenCount: number;
  reviewLikeCount: number;
  memberSince: string | null;
  favoriteFilms: ProfileStatsFilm[];
  genres: ProfileStatsGenre[];
  activity: ProfileStatsActivityDay[];
  recentDiary: ProfileStatsDiaryEntry[];
  cachedAt: string;
}

export interface CurrentProfilePatch {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  coverUrl: string | null;
  location: string | null;
  website: string | null;
  dateOfBirth: string | null;
  role: string | null;
  roleContext: string | null;
  headline?: string | null;
  headlineContext?: string | null;
}

type ProfileUpdateResponse = {
  ok: boolean;
  message?: string;
  profile: CurrentProfilePatch;
};

export async function fetchPublicProfile(
  username: string,
  token?: string | null
): Promise<PublicProfile | null> {
  try {
    var profile = await apiRequest<PublicProfile>(
      "/v1/profiles/" + encodeURIComponent(username),
      {
        token,
      }
    );
    return resolveProfileMediaUrls(profile);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function fetchCurrentUserProfile(token: string | null): Promise<CurrentUserProfile> {
  var profile = await apiRequest<CurrentUserProfile>("/v1/me", {
    token,
  });
  return resolveProfileMediaUrls(profile);
}

export async function fetchProfileStats(
  username: string,
  token?: string | null
): Promise<ProfileStatsSummary> {
  return apiRequest<ProfileStatsSummary>(
    "/v1/profiles/" + encodeURIComponent(username) + "/stats",
    {
      token,
    }
  );
}

export async function followUser(
  userId: string,
  token: string | null
): Promise<{ ok: true; isFollowing: boolean; status: "accepted" | "pending" }> {
  return apiRequest<{ ok: true; isFollowing: boolean; status: "accepted" | "pending" }>(
    `/v1/follows/${encodeURIComponent(userId)}`,
    {
      method: "POST",
      token,
    }
  );
}

export async function unfollowUser(userId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/follows/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    token,
  });
}

export async function blockUser(userId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/users/${encodeURIComponent(userId)}/block`, {
    method: "POST",
    token,
  });
}

export async function unblockUser(userId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/users/${encodeURIComponent(userId)}/block`, {
    method: "DELETE",
    token,
  });
}

export async function muteUser(userId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/users/${encodeURIComponent(userId)}/mute`, {
    method: "POST",
    token,
  });
}

export async function unmuteUser(userId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/users/${encodeURIComponent(userId)}/mute`, {
    method: "DELETE",
    token,
  });
}

export interface ModeratedUser {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
}

export interface ProfileConnectionUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  followedAt: string;
}

export interface ProfileFollowRequest {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  followedAt: string;
}

export async function fetchMyBlocks(
  token: string | null,
  params?: { cursor?: string | null; limit?: number }
): Promise<{ items: ModeratedUser[]; nextCursor: string | null; hasMore: boolean }> {
  var query = new URLSearchParams({
    limit: String(params?.limit ?? 50),
  });
  if (params?.cursor) query.set("cursor", params.cursor);

  return apiRequest<{ items: ModeratedUser[]; nextCursor: string | null; hasMore: boolean }>(
    "/v1/me/blocks?" + query.toString(),
    {
      token,
    }
  );
}

export async function fetchMyMutes(
  token: string | null,
  params?: { cursor?: string | null; limit?: number }
): Promise<{ items: ModeratedUser[]; nextCursor: string | null; hasMore: boolean }> {
  var query = new URLSearchParams({
    limit: String(params?.limit ?? 50),
  });
  if (params?.cursor) query.set("cursor", params.cursor);

  return apiRequest<{ items: ModeratedUser[]; nextCursor: string | null; hasMore: boolean }>(
    "/v1/me/mutes?" + query.toString(),
    {
      token,
    }
  );
}

export async function fetchProfileConnections(params: {
  username: string;
  kind: "followers" | "following";
  cursor?: string;
  limit?: number;
  token?: string | null;
}): Promise<{ items: ProfileConnectionUser[]; nextCursor: string | null; hasMore: boolean }> {
  var query = new URLSearchParams({
    limit: String(params.limit ?? 30),
  });
  if (params.cursor) query.set("cursor", params.cursor);

  var path =
    "/v1/profiles/" +
    encodeURIComponent(params.username) +
    "/" +
    params.kind +
    "?" +
    query.toString();

  return apiRequest<{ items: ProfileConnectionUser[]; nextCursor: string | null; hasMore: boolean }>(
    path,
    {
      token: params.token,
    }
  );
}

export async function fetchProfileFollowRequests(params: {
  username: string;
  cursor?: string;
  limit?: number;
  token?: string | null;
}): Promise<{ items: ProfileFollowRequest[]; nextCursor: string | null; hasMore: boolean }> {
  var query = new URLSearchParams({
    limit: String(params.limit ?? 30),
  });
  if (params.cursor) query.set("cursor", params.cursor);

  var path =
    "/v1/profiles/" +
    encodeURIComponent(params.username) +
    "/follow-requests?" +
    query.toString();

  return apiRequest<{ items: ProfileFollowRequest[]; nextCursor: string | null; hasMore: boolean }>(
    path,
    {
      token: params.token,
    }
  );
}

export async function fetchUsernameAvailability(username: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  return apiRequest<{ available: boolean; reason?: string }>(
    "/v1/usernames/" + encodeURIComponent(username) + "/available"
  );
}

export async function updateCurrentProfile(
  input: Partial<{
    displayName: string;
    bio: string | null;
    location: string | null;
    website: string | null;
    dateOfBirth: string | null;
    avatarUrl: string | null;
    avatarUrlLg?: string | null;
    coverUrl: string | null;
    role: string | null;
    roleContext: string | null;
    headline: string | null;
    headlineContext: string | null;
  }>,
  token: string | null
): Promise<CurrentProfilePatch> {
  const payload = await apiRequest<ProfileUpdateResponse>("/v1/profiles/me", {
    method: "PATCH",
    token,
    body: input,
  });

  return resolveProfileMediaUrls(payload.profile);
}
