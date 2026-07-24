import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiClient, ApiClientError } from "@35mm/api-client";
import {
  MobileUIProvider,
  SafeAreaProvider,
} from "@35mm/mobile-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { useEffect, useState, type ReactNode } from "react";

import {
  parseUsernameAvailability,
} from "@/features/auth/signup/api";
import {
  resetSignupDraftState,
  SIGNUP_DRAFT_STORAGE_KEY,
  useSignupDraftStore,
} from "@/features/auth/signup/draft";
import { SignupNameScreen } from "@/features/auth/signup/SignupNameScreen";
import {
  USERNAME_AVAILABILITY_DEBOUNCE_MS,
} from "@/features/auth/signup/useUsernameAvailability";
import { validateSignupIdentity } from "@/features/auth/signup/validation";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

type FetchMock = jest.Mock<
  Promise<Response>,
  [input: URL | RequestInfo, init?: RequestInit]
>;

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createClient(fetchImpl: FetchMock): ApiClient {
  return new ApiClient({
    baseUrl: "https://api.example.test",
    fetch: fetchImpl as typeof globalThis.fetch,
    createRequestId: () => "request-signup-name",
    platform: {
      platform: "ios",
      appVariant: "development",
      appVersion: "0.1.0",
    },
  });
}

function Providers({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      }),
  );
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider
        preference="dark"
        reduceMotion
        systemColorScheme="dark"
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

async function renderNameScreen(
  fetchImpl: FetchMock,
  overrides: {
    readonly onBack?: () => void;
    readonly onContinue?: () => void;
  } = {},
) {
  await act(() => {
    useSignupDraftStore.setState({ hasHydrated: true });
  });
  const view = await render(
    <Providers>
      <SignupNameScreen
        client={createClient(fetchImpl)}
        onBack={overrides.onBack ?? jest.fn()}
        onContinue={overrides.onContinue ?? jest.fn()}
      />
    </Providers>,
  );
  await waitFor(() =>
    expect(view.getByTestId("signup-name-screen")).toBeOnTheScreen(),
  );
  return view;
}

describe("signup Name/username contracts", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await act(() => {
      resetSignupDraftState();
    });
  });

  it("uses the shared username contract and validates the API trust boundary", () => {
    expect(validateSignupIdentity("  Maya Frames  ", "MAYA.frames")).toEqual({
      displayNameError: null,
      usernameError: null,
      value: {
        displayName: "Maya Frames",
        username: "maya.frames",
      },
    });
    expect(validateSignupIdentity("M", "bad name")).toMatchObject({
      displayNameError: "Full name must be at least 2 characters",
      usernameError: "Letters, numbers, dots and underscores only",
      value: null,
    });

    expect(parseUsernameAvailability({ available: true })).toEqual({
      available: true,
      reason: null,
    });
    expect(() => parseUsernameAvailability({ available: "yes" })).toThrow(
      "available",
    );
    expect(() =>
      parseUsernameAvailability({
        available: false,
        reason: "x".repeat(161),
      }),
    ).toThrow("reason");
  });

  it("renders one shared accessible step and preserves back navigation", async () => {
    const onBack = jest.fn();
    const fetchImpl = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const view = await renderNameScreen(fetchImpl, { onBack });

    expect(
      view.getByRole("header", { name: "Claim your 35mm." }),
    ).toBeOnTheScreen();
    expect(view.getByTestId("signup-progress")).toHaveProp(
      "accessibilityValue",
      { min: 1, max: 5, now: 1 },
    );
    expect(view.getByLabelText("Full name")).toHaveProp(
      "textContentType",
      "name",
    );
    expect(view.getByLabelText("Username")).toHaveProp(
      "textContentType",
      "username",
    );
    expect(view.getByTestId("signup-name-hero", {
      includeHiddenElements: true,
    })).toHaveProp("accessible", false);

    await fireEvent.press(view.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not query invalid usernames and never enables Continue without confirmation", async () => {
    const fetchImpl = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const view = await renderNameScreen(fetchImpl);

    await fireEvent.changeText(
      view.getByLabelText("Full name"),
      "Maya Frames",
    );
    await fireEvent.changeText(
      view.getByLabelText("Username"),
      "bad username",
    );
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, USERNAME_AVAILABILITY_DEBOUNCE_MS + 25),
      );
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(
      view.getByText("Letters, numbers, dots and underscores only"),
    ).toBeOnTheScreen();
    expect(view.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("debounces checks and ignores a stale available response", async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    let resolveSecond: ((value: Response) => void) | undefined;
    const first = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    const fetchImpl = jest
      .fn<
        Promise<Response>,
        [input: URL | RequestInfo, init?: RequestInit]
      >()
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => second);
    const view = await renderNameScreen(fetchImpl);

    await fireEvent.changeText(
      view.getByLabelText("Full name"),
      "Maya Frames",
    );
    await fireEvent.changeText(
      view.getByLabelText("Username"),
      "first.name",
    );
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, USERNAME_AVAILABILITY_DEBOUNCE_MS + 25),
      );
    });
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));

    await fireEvent.changeText(
      view.getByLabelText("Username"),
      "second.name",
    );
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, USERNAME_AVAILABILITY_DEBOUNCE_MS + 25),
      );
    });
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveFirst?.(response({ available: true }));
      await Promise.resolve();
    });
    expect(
      view.queryByText("35mm/second.name is available"),
    ).not.toBeOnTheScreen();
    expect(view.getByRole("button", { name: "Continue" })).toBeDisabled();

    await act(async () => {
      resolveSecond?.(response({ available: false, reason: "Already claimed" }));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(view.getByText("Already claimed")).toBeOnTheScreen(),
    );
    expect(view.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("surfaces availability failure, retries explicitly, and saves normalized identity once", async () => {
    const onContinue = jest.fn();
    const fetchImpl = jest
      .fn<
        Promise<Response>,
        [input: URL | RequestInfo, init?: RequestInit]
      >()
      .mockRejectedValueOnce(
        new ApiClientError("private network detail", {
          kind: "network",
          code: "NETWORK_ERROR",
          operation: "auth.signup.username-availability",
          requestId: "request-signup-name",
          retryable: true,
        }),
      )
      .mockResolvedValueOnce(response({ available: true }));
    const view = await renderNameScreen(fetchImpl, { onContinue });

    await fireEvent.changeText(
      view.getByLabelText("Full name"),
      "  Maya Frames  ",
    );
    await fireEvent.changeText(
      view.getByLabelText("Username"),
      "MAYA.Frames",
    );
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, USERNAME_AVAILABILITY_DEBOUNCE_MS + 25),
      );
    });
    await waitFor(() =>
      expect(
        view.getByText(
          "Couldn’t check this username. Check your connection and try again.",
        ),
      ).toBeOnTheScreen(),
    );
    expect(view.queryByText("private network detail")).not.toBeOnTheScreen();
    expect(view.getByRole("button", { name: "Continue" })).toBeDisabled();

    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(view.getByText("35mm/maya.frames is available")).toBeOnTheScreen(),
    );

    await fireEvent.press(view.getByRole("button", { name: "Continue" }));
    await fireEvent.press(
      view.getByRole("button", {
        name: "Continue",
        includeHiddenElements: true,
      }),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(useSignupDraftStore.getState()).toMatchObject({
      displayName: "Maya Frames",
      username: "maya.frames",
    });
  });

  it("restores only bounded non-secret identity fields after process recreation", async () => {
    useSignupDraftStore
      .getState()
      .setIdentityDraft("Maya Frames", "maya.frames");
    await waitFor(async () =>
      expect(
        await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY),
      ).not.toBeNull(),
    );
    const persisted = await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    expect(persisted).not.toContain("password");
    expect(persisted).not.toContain("token");

    useSignupDraftStore.setState({
      displayName: "",
      username: "",
      hasHydrated: false,
    });
    if (persisted) {
      await AsyncStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, persisted);
    }
    await useSignupDraftStore.persist.rehydrate();

    expect(useSignupDraftStore.getState()).toMatchObject({
      displayName: "Maya Frames",
      username: "maya.frames",
      hasHydrated: true,
    });
  });
});
