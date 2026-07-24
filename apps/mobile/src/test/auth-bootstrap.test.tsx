import { ApiClientError } from "@35mm/api-client";
import {
  AppText,
  MobileUIProvider,
  SafeAreaProvider,
} from "@35mm/mobile-ui";
import { fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AuthBootstrapGate } from "@/features/auth/bootstrap/AuthBootstrapGate";
import {
  parseCurrentUserBootstrapProfile,
  parseOnboardingStatus,
} from "@/features/auth/bootstrap/api";
import {
  resolveAuthBootstrapState,
} from "@/features/auth/bootstrap/state";
import {
  useAuthBootstrap,
  type AuthBootstrapController,
} from "@/features/auth/bootstrap/useAuthBootstrap";

jest.mock("@/features/auth/bootstrap/useAuthBootstrap", () => ({
  useAuthBootstrap: jest.fn(),
}));

const PROFILE = {
  userId: "user_35mm",
  username: "filmfriend",
  displayName: "Film Friend",
  avatarUrl: null,
  avatarUrlLg: "https://cdn.example.test/avatar.jpg",
  role: "critic",
  roleContext: null,
  filmsLoggedCount: 42,
  followerCount: 7,
  followingCount: 9,
} as const;

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider
        preference="light"
        reduceMotion
        systemColorScheme="light"
      >
        {children}
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

function controller(
  overrides: Partial<AuthBootstrapController>,
): AuthBootstrapController {
  return {
    state: { status: "loading" },
    isRetrying: false,
    isSigningOut: false,
    actionError: null,
    retry: jest.fn(),
    signOut: jest.fn(),
    ...overrides,
  };
}

describe("auth bootstrap contracts", () => {
  it("validates the current-user and onboarding trust boundaries", () => {
    expect(parseCurrentUserBootstrapProfile(PROFILE)).toEqual(PROFILE);
    expect(
      parseOnboardingStatus({
        completed: true,
        completedAt: "2026-07-23T10:00:00.000Z",
      }),
    ).toEqual({
      completed: true,
      completedAt: "2026-07-23T10:00:00.000Z",
    });

    expect(() =>
      parseCurrentUserBootstrapProfile({
        ...PROFILE,
        followerCount: -1,
      }),
    ).toThrow("followerCount");
    expect(() =>
      parseOnboardingStatus({
        completed: "yes",
        completedAt: null,
      }),
    ).toThrow("completed");
  });

  it("does not expose signed-out state while Clerk is restoring", () => {
    expect(
      resolveAuthBootstrapState({
        isLoaded: false,
        isSignedIn: false,
        userId: null,
        query: { data: undefined, error: null, isPending: true },
      }),
    ).toEqual({ status: "loading" });
  });

  it("routes verified bootstrap data by onboarding status", () => {
    expect(
      resolveAuthBootstrapState({
        isLoaded: true,
        isSignedIn: true,
        userId: PROFILE.userId,
        query: {
          data: {
            profile: PROFILE,
            onboarding: { completed: false },
          },
          error: null,
          isPending: false,
        },
      }),
    ).toEqual({ status: "onboarding", profile: PROFILE });

    expect(
      resolveAuthBootstrapState({
        isLoaded: true,
        isSignedIn: true,
        userId: PROFILE.userId,
        query: {
          data: {
            profile: PROFILE,
            onboarding: { completed: true },
          },
          error: null,
          isPending: false,
        },
      }),
    ).toEqual({ status: "authenticated", profile: PROFILE });
  });

  it("classifies connection failures without surfacing raw errors", () => {
    const state = resolveAuthBootstrapState({
      isLoaded: true,
      isSignedIn: true,
      userId: PROFILE.userId,
      query: {
        data: undefined,
        error: new ApiClientError("private transport detail", {
          kind: "network",
          code: "NETWORK_ERROR",
          operation: "auth-bootstrap.profile",
          requestId: "request-1",
          retryable: true,
        }),
        isPending: false,
      },
    });

    expect(state).toEqual({
      status: "recovery",
      kind: "offline",
      message:
        "35mm couldn’t reach the service. Check your connection and retry.",
    });
    expect(JSON.stringify(state)).not.toContain("private transport detail");
  });
});

describe("AuthBootstrapGate recovery", () => {
  const mockedUseAuthBootstrap = jest.mocked(useAuthBootstrap);

  beforeEach(() => {
    mockedUseAuthBootstrap.mockReset();
  });

  it("renders its resolved destination without changing it", async () => {
    mockedUseAuthBootstrap.mockReturnValue(
      controller({ state: { status: "signedOut" } }),
    );

    const view = await render(
      <Providers>
        <AuthBootstrapGate>
          {(destination) => <AppText>{destination.status}</AppText>}
        </AuthBootstrapGate>
      </Providers>,
    );

    expect(view.getByText("signedOut")).toBeOnTheScreen();
  });

  it("offers real retry and sign-out actions for bootstrap failure", async () => {
    const retry = jest.fn();
    const signOut = jest.fn();
    mockedUseAuthBootstrap.mockReturnValue(
      controller({
        state: {
          status: "recovery",
          kind: "offline",
          message: "Check your connection.",
        },
        retry,
        signOut,
      }),
    );

    const view = await render(
      <Providers>
        <AuthBootstrapGate>{() => null}</AuthBootstrapGate>
      </Providers>,
    );

    expect(view.getByTestId("auth-bootstrap-alert")).toHaveProp(
      "accessibilityRole",
      "alert",
    );
    await fireEvent.press(view.getByRole("button", { name: "Retry" }));
    await fireEvent.press(view.getByRole("button", { name: "Sign out" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("disables duplicate recovery actions while retrying", async () => {
    mockedUseAuthBootstrap.mockReturnValue(
      controller({
        state: {
          status: "recovery",
          kind: "error",
          message: "Restore failed.",
        },
        isRetrying: true,
      }),
    );

    const view = await render(
      <Providers>
        <AuthBootstrapGate>{() => null}</AuthBootstrapGate>
      </Providers>,
    );

    expect(
      view.getByTestId("auth-bootstrap-retry", {
        includeHiddenElements: true,
      }),
    ).toBeDisabled();
    expect(
      view.getByTestId("auth-bootstrap-sign-out", {
        includeHiddenElements: true,
      }),
    ).toBeDisabled();
  });
});
