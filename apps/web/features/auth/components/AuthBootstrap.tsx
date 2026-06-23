"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { preloadAvatarImageUrl } from "@/components/Avatar/avatarImageCache";
import { fetchFeed } from "@/features/feed/api/feedApi";
import { feedKeys } from "@/features/feed/hooks/queryKeys";
import type { FeedPage } from "@/features/feed/types/feed";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { fetchCurrentUserProfile, type CurrentUserProfile } from "@/features/profile/api/profileApi";
import { authKeys } from "../hooks/queryKeys";

function avatarUrlFromProfile(profile: CurrentUserProfile | undefined | null): string | null {
  const avatarUrl = profile?.avatarUrl;
  if (typeof avatarUrl !== "string") return null;
  const trimmed = avatarUrl.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function AuthBootstrap() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const prefetchedAfterAuthRef = useRef(false);
  const currentUserQuery = useCurrentUserProfile();

  useEffect(
    function preloadResolvedCurrentUserAvatar() {
      // Preload avatar so it's in browser image cache before any component renders it.
      preloadAvatarImageUrl(avatarUrlFromProfile(currentUserQuery.data));
    },
    [currentUserQuery.data]
  );

  useEffect(
    function warmAuthCaches() {
      if (!isLoaded || !isSignedIn) return;
      if (prefetchedAfterAuthRef.current) return;
      prefetchedAfterAuthRef.current = true;

      // Predictive prefetch: warm feed cache on auth to eliminate cold-start loading state.
      if (!queryClient.getQueryData(feedKeys.home())) {
        void queryClient.prefetchInfiniteQuery({
          queryKey: feedKeys.home(),
          queryFn: async function ({ pageParam }) {
            return fetchFeed({
              cursor: pageParam as string | undefined,
              token: await getToken(),
            });
          },
          initialPageParam: undefined as string | undefined,
          getNextPageParam: function (lastPage: FeedPage) {
            return lastPage.nextCursor ?? undefined;
          },
          staleTime: 30_000,
        });
      }

      const cachedProfile = queryClient.getQueryData<CurrentUserProfile>(authKeys.me());
      if (cachedProfile) {
        preloadAvatarImageUrl(avatarUrlFromProfile(cachedProfile));
      } else {
        void queryClient.fetchQuery({
          queryKey: authKeys.me(),
          queryFn: async function () {
            return fetchCurrentUserProfile(await getToken());
          },
          staleTime: 10 * 60 * 1000,
        }).then(function (profile) {
          preloadAvatarImageUrl(avatarUrlFromProfile(profile));
        }).catch(function () {
          // Shell auth bootstrap should not surface preload failures.
        });
      }
    },
    [getToken, isLoaded, isSignedIn, queryClient]
  );

  return null;
}
