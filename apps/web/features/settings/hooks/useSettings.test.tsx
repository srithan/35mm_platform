import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as settingsApi from "../api/settingsApi";
import { settingsKeys } from "./queryKeys";
import { useUpdateNotificationsMutation, useUpdateProfileMutation } from "./useSettings";

const fixture = {
  profile: {
    displayName: "Jane Doe",
    username: "jane.doe",
    email: "jane@example.com",
  },
  privacy: {
    privateAccount: false,
    allowMessagesFromAnyone: true,
    showActivityStatus: true,
  },
  notifications: {
    newFollowers: true,
    likesOnPosts: true,
    commentsAndReplies: true,
    mentions: true,
    festivalUpdates: true,
    watchlistStreaming: true,
    emailDigest: false,
  },
  appearance: {
    theme: "auto" as const,
    accentColor: "theme" as const,
    videoAutoplay: true,
  },
};

type SettingsState = typeof fixture;

let mockSettings: SettingsState = structuredClone(fixture);

function cloneSettings(): SettingsState {
  return structuredClone(mockSettings);
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: async () => "test-token",
    isLoaded: true,
    isSignedIn: true,
  }),
}));

vi.mock("../api/settingsApi", () => {
  return {
    getSettings: async () => cloneSettings(),
    updateProfile: async () => {
      return cloneSettings();
    },
    updatePrivacy: async () => {
      return cloneSettings();
    },
    updateNotifications: async () => {
      const next = cloneSettings();
      next.notifications.emailDigest = true;
      mockSettings = next;
      return next;
    },
    updateAppearance: async () => {
      return cloneSettings();
    },
  };
});

describe("useSettings mutations", () => {
  it("updates cache on successful notifications mutation", async () => {
    const queryClient = new QueryClient();
  const initial = await settingsApi.getSettings("test-token");
    queryClient.setQueryData(settingsKeys.detail(), initial);
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useUpdateNotificationsMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        ...initial.notifications,
        emailDigest: true,
      });
    });

    const cached = queryClient.getQueryData<SettingsState>(settingsKeys.detail());
    expect(cached?.notifications.emailDigest).toBe(true);
  });

  it("does not mutate cache on failed notifications mutation", async () => {
    const queryClient = new QueryClient();
    const initial = await settingsApi.getSettings("test-token");
    queryClient.setQueryData(settingsKeys.detail(), initial);
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useUpdateNotificationsMutation(), { wrapper });

    vi.spyOn(settingsApi, "updateNotifications").mockRejectedValueOnce(new Error("network failed"));

    let mutateError: unknown = null;
    try {
      await act(async () => {
        await result.current.mutateAsync({
          ...initial.notifications,
          emailDigest: true,
        });
      });
    } catch (error) {
      mutateError = error;
    }

    const cached = queryClient.getQueryData<SettingsState>(settingsKeys.detail());
    expect(mutateError).toBeTruthy();
    expect(cached).toEqual(initial);
  });

  it("updates cache on profile mutation and keeps username", async () => {
    const queryClient = new QueryClient();
    const initial = await settingsApi.getSettings("test-token");
    queryClient.setQueryData(settingsKeys.detail(), initial);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

    const next = { ...initial.profile, displayName: "Jane Updated" };
    const profileBefore = (await settingsApi.getSettings("test-token")).profile;

    mockSettings = {
      ...mockSettings,
      profile: {
        ...mockSettings.profile,
        displayName: "Jane Updated",
      },
    };

    await act(async () => {
      await result.current.mutateAsync(next);
    });

    const cached = queryClient.getQueryData<SettingsState>(settingsKeys.detail());
    expect(cached?.profile.displayName).toBe("Jane Updated");
    expect(cached?.profile.username).toBe(profileBefore.username);
  });
});
