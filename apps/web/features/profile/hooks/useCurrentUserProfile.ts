"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUserProfile } from "../api/profileApi";
import { authKeys } from "@/features/auth/hooks/queryKeys";

export function useCurrentUserProfile() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => fetchCurrentUserProfile(await getToken()),
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 60_000,
    refetchOnMount: true,
    retry: 1,
  });
}

export function initialForName(value: string | undefined | null): string {
  var text = value?.trim();
  return text ? text.charAt(0).toUpperCase() : "?";
}
