import type { ApiClient } from "@35mm/api-client";
import type { FeedPage, FilmListPage, ModerationReportReason, ReportDto } from "@35mm/types";

import { parseUsernameAvailability, type UsernameAvailability } from "@/features/auth/signup/api";
import {
  parseProfileConnectionsPage,
  parseProfileFeedPage,
  parseProfileListPage,
  parseProfileMediaPresign,
  parseProfileStats,
  parsePublicProfile,
  parseCurrentProfilePatch,
  type CurrentProfilePatch,
  type ProfileConnectionsPage,
  type ProfileMediaPresign,
  type ProfileStatsSummary,
  type PublicProfile,
} from "./contracts";
import type { ProfileConnectionsKind, ProfileFeedKind } from "./queryKeys";

export type ProfileUpdateInput = Partial<{
  readonly displayName: string;
  readonly bio: string;
  readonly location: string | null;
  readonly website: string | null;
  readonly dateOfBirth: string | null;
  readonly role: string | null;
  readonly roleContext: string | null;
  readonly headline: string | null;
  readonly headlineContext: string | null;
  readonly avatarUrl: string | null;
  readonly coverUrl: string | null;
}>;

function parseProfileUpdate(value: unknown): CurrentProfilePatch {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("ProfileUpdateResponse must be an object.");
  }
  return parseCurrentProfilePatch((value as Record<string, unknown>).profile);
}

function parseFollowResponse(value: unknown): { readonly status: "accepted" | "pending" } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("FollowResponse must be an object.");
  }
  const status = (value as Record<string, unknown>).status;
  if (status !== "accepted" && status !== "pending") {
    throw new Error("FollowResponse.status is invalid.");
  }
  return { status };
}

function parseOk(value: unknown): { readonly ok: boolean } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Mutation response must be an object.");
  }
  const ok = (value as Record<string, unknown>).ok;
  if (typeof ok !== "boolean") {
    throw new Error("Mutation response ok must be a boolean.");
  }
  return { ok };
}

function parseReport(value: unknown): ReportDto {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("ReportResponse must be an object.");
  }
  const report = (value as Record<string, unknown>).report;
  if (typeof report !== "object" || report === null || Array.isArray(report)) {
    throw new Error("ReportResponse.report must be an object.");
  }
  const row = report as Record<string, unknown>;
  if (typeof row.id !== "string" ||
      row.contentType !== "profile" ||
      typeof row.contentId !== "string" ||
      typeof row.reason !== "string" ||
      (row.details !== null && typeof row.details !== "string") ||
      typeof row.status !== "string" ||
      typeof row.createdAt !== "string" ||
      typeof row.updatedAt !== "string") {
    throw new Error("ReportResponse.report is invalid.");
  }
  return row as unknown as ReportDto;
}

export function fetchPublicProfile(
  client: ApiClient,
  username: string,
  signal?: AbortSignal,
): Promise<PublicProfile> {
  return client.request(`/v1/profiles/${encodeURIComponent(username.toLowerCase())}`, {
    auth: "optional",
    operation: "profiles.detail",
    parser: parsePublicProfile,
    ...(signal ? { signal } : {}),
  });
}

export function fetchProfileFeedPage(
  client: ApiClient,
  input: {
    readonly username: string;
    readonly kind: ProfileFeedKind;
    readonly cursor: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<FeedPage> {
  const query = new URLSearchParams({ limit: "20" });
  if (input.cursor) query.set("cursor", input.cursor);
  if (input.kind === "reposts") query.set("kind", "reposts");
  return client.request(
    `/v1/feed/profiles/${encodeURIComponent(input.username.toLowerCase())}/posts?${query.toString()}`,
    {
      auth: "optional",
      operation: input.kind === "reposts" ? "profiles.reposts" : "profiles.posts",
      parser: parseProfileFeedPage,
      ...(input.signal ? { signal: input.signal } : {}),
    },
  );
}

export function fetchProfileListsPage(
  client: ApiClient,
  input: {
    readonly username: string;
    readonly cursor: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<FilmListPage> {
  const query = new URLSearchParams({ limit: "20", sort: "updated" });
  if (input.cursor) query.set("cursor", input.cursor);
  return client.request(
    `/v1/lists/profile/${encodeURIComponent(input.username.toLowerCase())}?${query.toString()}`,
    {
      auth: "optional",
      operation: "profiles.lists",
      parser: parseProfileListPage,
      ...(input.signal ? { signal: input.signal } : {}),
    },
  );
}

export function fetchProfileStats(
  client: ApiClient,
  username: string,
  signal?: AbortSignal,
): Promise<ProfileStatsSummary> {
  return client.request(`/v1/profiles/${encodeURIComponent(username.toLowerCase())}/stats`, {
    auth: "optional",
    operation: "profiles.stats",
    parser: parseProfileStats,
    ...(signal ? { signal } : {}),
  });
}

export function fetchProfileConnectionsPage(
  client: ApiClient,
  input: {
    readonly username: string;
    readonly kind: ProfileConnectionsKind;
    readonly cursor: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<ProfileConnectionsPage> {
  const query = new URLSearchParams({ limit: "30" });
  if (input.cursor) query.set("cursor", input.cursor);
  return client.request(
    `/v1/profiles/${encodeURIComponent(input.username.toLowerCase())}/${input.kind}?${query.toString()}`,
    {
      auth: "optional",
      operation: `profiles.${input.kind}`,
      parser: parseProfileConnectionsPage,
      ...(input.signal ? { signal: input.signal } : {}),
    },
  );
}

export function followProfile(
  client: ApiClient,
  userId: string,
): Promise<{ readonly status: "accepted" | "pending" }> {
  return client.request(`/v1/follows/${encodeURIComponent(userId)}`, {
    auth: "required",
    method: "POST",
    operation: "profiles.follow",
    parser: parseFollowResponse,
    requestClass: "mutation",
  });
}

export function unfollowProfile(client: ApiClient, userId: string): Promise<{ readonly ok: boolean }> {
  return client.request(`/v1/follows/${encodeURIComponent(userId)}`, {
    auth: "required",
    method: "DELETE",
    operation: "profiles.unfollow",
    parser: parseOk,
    requestClass: "mutation",
  });
}

export function setProfileMuted(
  client: ApiClient,
  userId: string,
  muted: boolean,
): Promise<{ readonly ok: boolean }> {
  return client.request(`/v1/users/${encodeURIComponent(userId)}/mute`, {
    auth: "required",
    method: muted ? "POST" : "DELETE",
    operation: muted ? "profiles.mute" : "profiles.unmute",
    parser: parseOk,
    requestClass: "mutation",
  });
}

export function blockProfile(client: ApiClient, userId: string): Promise<{ readonly ok: boolean }> {
  return client.request(`/v1/users/${encodeURIComponent(userId)}/block`, {
    auth: "required",
    method: "POST",
    operation: "profiles.block",
    parser: parseOk,
    requestClass: "mutation",
  });
}

export function reportProfile(
  client: ApiClient,
  input: {
    readonly userId: string;
    readonly reason: ModerationReportReason;
    readonly details: string | null;
  },
): Promise<ReportDto> {
  return client.request("/v1/reports", {
    auth: "required",
    body: {
      contentType: "profile",
      contentId: input.userId,
      reason: input.reason,
      ...(input.details ? { details: input.details } : {}),
    },
    method: "POST",
    operation: "profiles.report",
    parser: parseReport,
    requestClass: "mutation",
  });
}

export function updateCurrentProfile(
  client: ApiClient,
  input: ProfileUpdateInput,
): Promise<CurrentProfilePatch> {
  return client.request("/v1/profiles/me", {
    auth: "required",
    body: input,
    method: "PATCH",
    operation: "profiles.update",
    parser: parseProfileUpdate,
    requestClass: "mutation",
  });
}

export function updateCurrentUsername(
  client: ApiClient,
  username: string,
): Promise<string> {
  return client.request("/v1/me/settings/profile", {
    auth: "required",
    body: { username },
    method: "PATCH",
    operation: "profiles.update-username",
    parser: (value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("UsernameUpdateResponse must be an object.");
      }
      const profile = (value as Record<string, unknown>).profile;
      if (typeof profile !== "object" || profile === null || Array.isArray(profile)) {
        throw new Error("UsernameUpdateResponse.profile must be an object.");
      }
      const next = (profile as Record<string, unknown>).username;
      if (typeof next !== "string" || next.trim().length === 0) {
        throw new Error("UsernameUpdateResponse.profile.username must be a string.");
      }
      return next;
    },
    requestClass: "mutation",
  });
}

export function checkProfileUsernameAvailability(
  client: Pick<ApiClient, "request">,
  username: string,
  signal: AbortSignal,
): Promise<UsernameAvailability> {
  return client.request(`/v1/usernames/${encodeURIComponent(username)}/available`, {
    auth: "none",
    maxAttempts: 1,
    operation: "profiles.username-availability",
    parser: parseUsernameAvailability,
    signal,
  });
}

export function presignProfileMedia(
  client: ApiClient,
  input: {
    readonly kind: "avatar" | "cover";
    readonly contentType: string;
    readonly contentLength: number;
  },
): Promise<ProfileMediaPresign> {
  return client.request("/v1/media/presign", {
    auth: "required",
    body: input,
    method: "POST",
    operation: `profiles.${input.kind}.presign`,
    parser: parseProfileMediaPresign,
    requestClass: "mutation",
  });
}
