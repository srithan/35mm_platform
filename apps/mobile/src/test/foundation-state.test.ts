import { ApiClientError } from "@35mm/api-client";

import { isForegroundAppState, isOnlineNetInfoState } from "@/providers/lifecycle";
import { shouldRetryMobileQuery } from "@/services/queryClient";
import { resetMobileUiState, useMobileUiStore } from "@/state/ui";

describe("mobile foundation state boundaries", () => {
  beforeEach(() => {
    resetMobileUiState();
  });

  it("keeps transient chrome and composer metadata in Zustand", () => {
    useMobileUiStore.getState().openDrawer();
    useMobileUiStore.getState().setBottomChromeVisible(false);
    useMobileUiStore.getState().presentComposer({ mode: "review", quotedPostId: "post-1" });

    expect(useMobileUiStore.getState()).toMatchObject({
      isDrawerOpen: true,
      isBottomChromeVisible: false,
      composer: { mode: "review", quotedPostId: "post-1" },
    });

    resetMobileUiState();
    expect(useMobileUiStore.getState()).toMatchObject({
      isDrawerOpen: false,
      isBottomChromeVisible: true,
      composer: null,
    });
  });

  it("maps native lifecycle and connectivity without optimistic online assumptions", () => {
    expect(isForegroundAppState("active")).toBe(true);
    expect(isForegroundAppState("background")).toBe(false);
    expect(isOnlineNetInfoState({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnlineNetInfoState({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(isOnlineNetInfoState({ isConnected: false, isInternetReachable: null })).toBe(false);
    expect(isOnlineNetInfoState({ isConnected: null, isInternetReachable: null })).toBe(false);
  });

  it("retries only one classified retryable server query", () => {
    const retryable = new ApiClientError("offline", {
      kind: "network",
      code: "NETWORK_ERROR",
      operation: "feed.home",
      requestId: "request-1",
      retryable: true,
    });
    expect(shouldRetryMobileQuery(0, retryable)).toBe(true);
    expect(shouldRetryMobileQuery(1, retryable)).toBe(false);
    expect(shouldRetryMobileQuery(0, new Error("unknown"))).toBe(false);
  });
});
