import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSettings } from "../api/settingsApi";
import { resetMockSettings, setMockSettingsFailure } from "../data/mockSettings";
import { settingsKeys } from "./queryKeys";
import { useUpdateNotificationsMutation } from "./useSettings";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useSettings mutations", () => {
  it("updates cache on successful notifications mutation", async () => {
    resetMockSettings();
    const queryClient = new QueryClient();
    const wrapper = createWrapper(queryClient);
    const initial = await getSettings();
    queryClient.setQueryData(settingsKeys.detail(), initial);

    const { result } = renderHook(() => useUpdateNotificationsMutation(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        ...initial.notifications,
        emailDigest: true,
      });
    });

    const cached = queryClient.getQueryData<Awaited<ReturnType<typeof getSettings>>>(
      settingsKeys.detail()
    );
    expect(cached?.notifications.emailDigest).toBe(true);
  });

  it("rolls back cache on failed notifications mutation", async () => {
    resetMockSettings();
    const queryClient = new QueryClient();
    const wrapper = createWrapper(queryClient);
    const initial = await getSettings();
    queryClient.setQueryData(settingsKeys.detail(), initial);
    setMockSettingsFailure("Forced failure");

    const { result } = renderHook(() => useUpdateNotificationsMutation(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          ...initial.notifications,
          emailDigest: true,
        });
      })
    ).rejects.toThrow("Forced failure");

    const cached = queryClient.getQueryData<Awaited<ReturnType<typeof getSettings>>>(
      settingsKeys.detail()
    );
    expect(cached).toEqual(initial);
    setMockSettingsFailure(null);
  });
});
