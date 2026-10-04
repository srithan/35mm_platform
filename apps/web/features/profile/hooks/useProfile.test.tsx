import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicProfile } from "../api/profileApi";
import { profileKeys } from "./queryKeys";
import { useFollowToggle } from "./useProfile";

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

vi.mock("../api/profileApi", async function (importOriginal) {
  var original = await importOriginal<typeof import("../api/profileApi")>();
  return {
    ...original,
    followUser: apiMocks.followUser,
    unfollowUser: apiMocks.unfollowUser,
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function profile(followState: PublicProfile["followState"]): PublicProfile {
  return {
    userId: "target-id",
    username: "target",
    displayName: "Target",
    bio: null,
    avatarUrl: null,
    coverUrl: null,
    location: null,
    website: null,
    dateOfBirth: null,
    role: null,
    roleContext: null,
    filmsLoggedCount: 0,
    followerCount: 20,
    followingCount: 7,
    followState,
    isPrivate: false,
    isDeactivated: false,
  };
}

describe("useFollowToggle", function () {
  beforeEach(function () {
    apiMocks.followUser.mockReset();
    apiMocks.unfollowUser.mockReset();
  });

  it("keeps optimistic follow state and count while request resolves", async function () {
    var resolveFollow: ((value: {
      ok: true;
      isFollowing: true;
      status: "accepted";
      created: true;
    }) => void) | undefined;
    apiMocks.followUser.mockReturnValue(
      new Promise(function (resolve) {
        resolveFollow = resolve;
      })
    );
    var queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(profileKeys.detail("target"), profile("none"));
    var { result } = renderHook(function () {
      return useFollowToggle("target");
    }, { wrapper: createWrapper(queryClient) });

    act(function () {
      result.current.mutate({ userId: "target-id", followState: "none" });
    });

    await waitFor(function () {
      expect(queryClient.getQueryData<PublicProfile>(profileKeys.detail("target"))).toMatchObject({
        followState: "following",
        followerCount: 21,
      });
    });

    await act(async function () {
      resolveFollow?.({
        ok: true,
        isFollowing: true,
        status: "accepted",
        created: true,
      });
    });
    await waitFor(function () {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryClient.getQueryData<PublicProfile>(profileKeys.detail("target"))).toMatchObject({
      followState: "following",
      followerCount: 21,
    });
  });

  it("keeps optimistic unfollow state and count after success", async function () {
    apiMocks.unfollowUser.mockResolvedValue({
      ok: true,
      isFollowing: false,
      deleted: true,
    });
    var queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(profileKeys.detail("target"), profile("following"));
    var { result } = renderHook(function () {
      return useFollowToggle("target");
    }, { wrapper: createWrapper(queryClient) });

    await act(async function () {
      await result.current.mutateAsync({
        userId: "target-id",
        followState: "following",
      });
    });

    expect(queryClient.getQueryData<PublicProfile>(profileKeys.detail("target"))).toMatchObject({
      followState: "none",
      followerCount: 19,
    });
  });
});
