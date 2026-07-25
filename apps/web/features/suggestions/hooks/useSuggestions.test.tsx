import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import type {
  CurrentUserProfile,
  PublicProfile,
} from "@/features/profile/api/profileApi";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import { useSuggestionFollowMutation } from "./useSuggestions";

var apiMocks = vi.hoisted(function () {
  return {
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
  };
});

vi.mock("@clerk/nextjs", function () {
  return {
    useAuth: function () {
      return {
        getToken: async function () {
          return "test-token";
        },
        isLoaded: true,
        isSignedIn: true,
      };
    },
  };
});

vi.mock("@/features/profile/api/profileApi", function () {
  return {
    followUser: apiMocks.followUser,
    unfollowUser: apiMocks.unfollowUser,
  };
});

vi.mock("../api/suggestionsApi", function () {
  return {
    fetchPeopleSuggestions: vi.fn(),
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function publicProfile(input: {
  userId: string;
  username: string;
  followState: PublicProfile["followState"];
  followerCount: number;
  followingCount: number;
}): PublicProfile {
  return {
    userId: input.userId,
    username: input.username,
    displayName: input.username,
    bio: null,
    avatarUrl: null,
    coverUrl: null,
    location: null,
    website: null,
    dateOfBirth: null,
    role: null,
    roleContext: null,
    filmsLoggedCount: 0,
    followerCount: input.followerCount,
    followingCount: input.followingCount,
    followState: input.followState,
    isPrivate: false,
    isDeactivated: false,
  };
}

function seedProfiles(queryClient: QueryClient) {
  var currentUser: CurrentUserProfile = {
    userId: "viewer-id",
    username: "viewer",
    displayName: "Viewer",
    avatarUrl: null,
    role: null,
    roleContext: null,
    filmsLoggedCount: 0,
    followerCount: 5,
    followingCount: 10,
  };
  queryClient.setQueryData(authKeys.me(), currentUser);
  queryClient.setQueryData(
    profileKeys.detail("viewer"),
    publicProfile({
      userId: "viewer-id",
      username: "viewer",
      followState: "self",
      followerCount: 5,
      followingCount: 10,
    })
  );
  queryClient.setQueryData(
    profileKeys.detail("target"),
    publicProfile({
      userId: "target-id",
      username: "target",
      followState: "none",
      followerCount: 20,
      followingCount: 7,
    })
  );
}

describe("useSuggestionFollowMutation", function () {
  beforeEach(function () {
    apiMocks.followUser.mockReset();
    apiMocks.unfollowUser.mockReset();
  });

  it("updates actor following count and target follower count after an accepted follow", async function () {
    apiMocks.followUser.mockResolvedValue({
      ok: true,
      isFollowing: true,
      status: "accepted",
      created: true,
    });
    var queryClient = new QueryClient();
    seedProfiles(queryClient);
    var wrapper = createWrapper(queryClient);
    var { result } = renderHook(function () {
      return useSuggestionFollowMutation();
    }, { wrapper });

    await act(async function () {
      await result.current.mutateAsync({
        userId: "target-id",
        username: "target",
        followState: "none",
      });
    });

    expect(queryClient.getQueryData<CurrentUserProfile>(authKeys.me())?.followingCount).toBe(11);
    expect(
      queryClient.getQueryData<PublicProfile>(profileKeys.detail("viewer"))?.followingCount
    ).toBe(11);
    expect(
      queryClient.getQueryData<PublicProfile>(profileKeys.detail("target"))
    ).toMatchObject({
      followState: "following",
      followerCount: 21,
    });
  });

  it("marks private follow requests without changing either count", async function () {
    apiMocks.followUser.mockResolvedValue({
      ok: true,
      isFollowing: false,
      status: "pending",
      created: true,
    });
    var queryClient = new QueryClient();
    seedProfiles(queryClient);
    var wrapper = createWrapper(queryClient);
    var { result } = renderHook(function () {
      return useSuggestionFollowMutation();
    }, { wrapper });

    await act(async function () {
      await result.current.mutateAsync({
        userId: "target-id",
        username: "target",
        followState: "none",
      });
    });

    expect(queryClient.getQueryData<CurrentUserProfile>(authKeys.me())?.followingCount).toBe(10);
    expect(
      queryClient.getQueryData<PublicProfile>(profileKeys.detail("viewer"))?.followingCount
    ).toBe(10);
    expect(
      queryClient.getQueryData<PublicProfile>(profileKeys.detail("target"))
    ).toMatchObject({
      followState: "requested",
      followerCount: 20,
    });
  });
});
