"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchOnboardingStatus,
  fetchOnboardingSuggestions,
  resolveOnboardingFilmsFromTmdb,
  submitOnboarding,
  type ResolveTmdbFilmInput,
  type SubmitOnboardingInput,
} from "../api/onboardingApi";
import { onboardingKeys } from "./queryKeys";

export function useOnboardingStatus(enabled = true) {
  var { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: async function () {
      return fetchOnboardingStatus(await getToken());
    },
    enabled: enabled && isLoaded && Boolean(isSignedIn),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useOnboardingSuggestions(enabled = true) {
  var { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: onboardingKeys.suggestions(),
    queryFn: async function () {
      return fetchOnboardingSuggestions(await getToken());
    },
    enabled: enabled && isLoaded && Boolean(isSignedIn),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useResolveOnboardingFilms() {
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (films: ResolveTmdbFilmInput[]) {
      return resolveOnboardingFilmsFromTmdb(films, await getToken());
    },
  });
}

export function useSubmitOnboarding() {
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: SubmitOnboardingInput) {
      return submitOnboarding(input, await getToken());
    },
  });
}
