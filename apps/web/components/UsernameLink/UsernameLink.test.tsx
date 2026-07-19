import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsernameLink } from "./UsernameLink";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn(async () => "test-token"),
    isLoaded: true,
  }),
}));

vi.mock("@/features/profile/hooks/useCurrentUserProfile", () => ({
  useCurrentUserProfile: () => ({ data: { username: "viewer" } }),
}));

vi.mock("@/features/profile/hooks/useProfile", () => ({
  useFollowToggle: () => ({ isPending: false, mutate: vi.fn() }),
  usePublicProfile: () => ({ data: undefined, isLoading: false }),
}));

function setProfilePopoverCapability(matches: boolean) {
  const listeners = new Set<() => void>();
  const mediaQuery = {
    matches,
    media: "(hover: hover) and (pointer: fine)",
    onchange: null,
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.delete(listener);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList;

  vi.spyOn(window, "matchMedia").mockReturnValue(mediaQuery);
}

function renderUsernameLink() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UsernameLink username="alice" displayName="Alice" />
    </QueryClientProvider>
  );
}

describe("UsernameLink profile preview capability", () => {
  beforeEach(() => {
    setProfilePopoverCapability(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never opens profile preview on touch-only devices", async () => {
    renderUsernameLink();
    const link = screen.getByRole("link", { name: "Alice" });

    await waitFor(() => expect(window.matchMedia).toHaveBeenCalled());
    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    fireEvent.touchStart(link);

    expect(screen.queryByText("View profile")).not.toBeInTheDocument();
  });

  it("keeps profile preview available for hover-capable fine pointers", async () => {
    setProfilePopoverCapability(true);
    renderUsernameLink();
    const link = screen.getByRole("link", { name: "Alice" });

    await waitFor(() => {
      fireEvent.focus(link);
      expect(screen.getByText("View profile")).toBeInTheDocument();
    });
  });
});
