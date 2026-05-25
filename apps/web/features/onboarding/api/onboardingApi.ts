"use client";

import { apiRequest } from "@/features/feed/api/http";

export type OnboardingRole =
  | "cinephile"
  | "creator"
  | "critic"
  | "film_student"
  | "industry";

export interface OnboardingStatusResponse {
  completed: boolean;
  completedAt: string | null;
}

export interface ResolveTmdbFilmInput {
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
}

export interface OnboardingSuggestionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string | null;
  roleContext: string | null;
  filmsLoggedCount: number;
  followerCount: number;
}

export interface SubmitOnboardingInput {
  role: OnboardingRole;
  headlineContext?: string;
  favoriteFilmIds: string[];
  favoriteGenreIds: string[];
  followUserIds: string[];
}

export async function fetchOnboardingStatus(
  token: string | null
): Promise<OnboardingStatusResponse> {
  return apiRequest<OnboardingStatusResponse>("/v1/me/onboarding-status", { token });
}

export async function resolveOnboardingFilmsFromTmdb(
  films: ResolveTmdbFilmInput[],
  token: string | null
): Promise<string[]> {
  if (films.length === 0) return [];
  var response = await apiRequest<{ ids: string[] }>("/v1/onboarding/films/resolve", {
    method: "POST",
    token,
    body: { films },
  });
  return response.ids;
}

export async function fetchOnboardingSuggestions(
  token: string | null
): Promise<OnboardingSuggestionUser[]> {
  var response = await apiRequest<{ users: OnboardingSuggestionUser[] }>(
    "/v1/onboarding/suggestions",
    { token }
  );
  return response.users;
}

export async function submitOnboarding(
  input: SubmitOnboardingInput,
  token: string | null
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>("/v1/me/onboarding", {
    method: "POST",
    token,
    body: input,
  });
}
