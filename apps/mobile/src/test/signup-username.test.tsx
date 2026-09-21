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

import { parseUsernameAvailability } from "@/features/auth/signup/api";
import {
  resetSignupDraftState,
  SIGNUP_DRAFT_STORAGE_KEY,
  useSignupDraftStore,
} from "@/features/auth/signup/draft";
import { SignupUsernameScreen } from "@/features/auth/signup/SignupUsernameScreen";
import { USERNAME_AVAILABILITY_DEBOUNCE_MS } from "@/features/auth/signup/useUsernameAvailability";
import { validateSignupUsername } from "@/features/auth/signup/validation";

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
    createRequestId: () => "request-signup-username",
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

async function renderUsernameScreen(
  fetchImpl: FetchMock,
  overrides: {
    readonly onBack?: () => void;
    readonly onContinue?: () => void;
  } = {},
) {
  await act(() => {
    useSignupDraftStore.setState({
      displayName: "Maya Frames",
      hasHydrated: true,
    });
  });
  const view = await render(
    <Providers>
      <SignupUsernameScreen
        client={createClient(fetchImpl)}
        onBack={overrides.onBack ?? jest.fn()}
        onContinue={overrides.onContinue ?? jest.fn()}
      />
    </Providers>,
  );
  await waitFor(() =>
    expect(view.getByTestId("signup-username-screen")).toBeOnTheScreen(),
  );
  return view;
}

describe("signup Username step", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await act(() => {
      resetSignupDraftState();
    });
  });

  it("uses the shared username contract and validates the API trust boundary", () => {
    expect(validateSignupUsername("MAYA.frames")).toEqual({
      error: null,
      value: "maya.frames",
    });
    expect(validateSignupUsername("bad name")).toEqual({
      error: "Letters, numbers, dots and underscores only",
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

  it("renders one username field and blocks invalid usernames without querying", async () => {
    const fetchImpl = jest.fn<
      Promise<Response>,
      [input: URL | RequestInfo, init?: RequestInit]
    >();
    const view = await renderUsernameScreen(fetchImpl);

    expect(
      view.getByRole("header", { name: "Choose your username." }),
    ).toBeOnTheScreen();
    expect(view.getByTestId("signup-progress")).toHaveProp(
      "accessibilityValue",
      { min: 1, max: 6, now: 2 },
    );
    expect(view.getByLabelText("Username")).toHaveProp(
      "textContentType",
      "username",
    );
    expect(view.queryByLabelText("Full name")).not.toBeOnTheScreen();

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

  it("debounces checks, retries failure, and saves normalized username once", async () => {
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
          requestId: "request-signup-username",
          retryable: true,
        }),
      )
      .mockResolvedValueOnce(response({ available: true }));
    const view = await renderUsernameScreen(fetchImpl, { onContinue });

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

    await waitFor(async () =>
      expect(
        await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY),
      ).not.toBeNull(),
    );
    const persisted = await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    expect(persisted).toContain("maya.frames");
    expect(persisted).not.toContain("password");
  });
});

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
