"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  fetchProfileConnections,
  type ProfileConnectionUser,
} from "@/features/profile/api/profileApi";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";

function mergeConnections(
  followers: ProfileConnectionUser[],
  following: ProfileConnectionUser[]
): ProfileConnectionUser[] {
  var map = new Map<string, ProfileConnectionUser>();
  for (var i = 0; i < followers.length; i++) {
    map.set(followers[i].userId, followers[i]);
  }
  for (var j = 0; j < following.length; j++) {
    map.set(following[j].userId, following[j]);
  }
  return Array.from(map.values()).sort(function (a, b) {
    return a.displayName.localeCompare(b.displayName);
  });
}

export function useChatContactCandidates(search: string, enabled: boolean) {
  var { getToken, isLoaded, isSignedIn } = useAuth();
  var currentUserQuery = useCurrentUserProfile();
  var username = currentUserQuery.data?.username ?? "";

  var followersQuery = useQuery({
    queryKey: ["chat", "contacts", "followers", username],
    queryFn: async function () {
      return fetchProfileConnections({
        username: username,
        kind: "followers",
        limit: 50,
        token: await getToken(),
      });
    },
    enabled: enabled && isLoaded && Boolean(isSignedIn) && username.length > 0,
    staleTime: 60_000,
  });

  var followingQuery = useQuery({
    queryKey: ["chat", "contacts", "following", username],
    queryFn: async function () {
      return fetchProfileConnections({
        username: username,
        kind: "following",
        limit: 50,
        token: await getToken(),
      });
    },
    enabled: enabled && isLoaded && Boolean(isSignedIn) && username.length > 0,
    staleTime: 60_000,
  });

  var candidates = useMemo(
    function () {
      var merged = mergeConnections(
        followersQuery.data?.items ?? [],
        followingQuery.data?.items ?? []
      );
      var needle = search.trim().toLowerCase();
      if (!needle) {
        return merged;
      }
      return merged.filter(function (user) {
        return (
          user.username.toLowerCase().indexOf(needle) !== -1 ||
          user.displayName.toLowerCase().indexOf(needle) !== -1
        );
      });
    },
    [followersQuery.data, followingQuery.data, search]
  );

  return {
    candidates: candidates,
    isLoading:
      currentUserQuery.isLoading ||
      followersQuery.isLoading ||
      followingQuery.isLoading,
    isError: followersQuery.isError || followingQuery.isError,
    refetch: function () {
      void followersQuery.refetch();
      void followingQuery.refetch();
    },
  };
}
