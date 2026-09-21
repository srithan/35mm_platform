import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MobileUIProvider,
  SafeAreaProvider,
} from "@35mm/mobile-ui";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  resetSignupDraftState,
  SIGNUP_DRAFT_STORAGE_KEY,
  useSignupDraftStore,
} from "@/features/auth/signup/draft";
import { SignupNameScreen } from "@/features/auth/signup/SignupNameScreen";
import {
  validateSignupDisplayName,
  validateSignupIdentity,
} from "@/features/auth/signup/validation";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider
        preference="dark"
        reduceMotion
        systemColorScheme="dark"
      >
        {children}
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

async function renderNameScreen(
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

describe("signup Name step", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await act(() => {
      resetSignupDraftState();
    });
  });

  it("validates display name independently from username", () => {
    expect(validateSignupDisplayName("  Maya Frames  ")).toEqual({
      error: null,
      value: "Maya Frames",
    });
    expect(validateSignupDisplayName("M")).toEqual({
      error: "Full name must be at least 2 characters",
      value: null,
    });
    expect(validateSignupIdentity("Maya Frames", "MAYA.frames")).toEqual({
      displayNameError: null,
      usernameError: null,
      value: {
        displayName: "Maya Frames",
        username: "maya.frames",
      },
    });
  });

  it("renders one top-aligned accessible field and preserves back navigation", async () => {
    const onBack = jest.fn();
    const view = await renderNameScreen({ onBack });

    expect(
      view.getByRole("header", { name: "What's your name?" }),
    ).toBeOnTheScreen();
    expect(view.getByTestId("signup-progress")).toHaveProp(
      "accessibilityValue",
      { min: 1, max: 6, now: 1 },
    );
    expect(view.getByLabelText("Full name")).toHaveProp(
      "textContentType",
      "name",
    );
    expect(view.queryByLabelText("Username")).not.toBeOnTheScreen();
    expect(
      view.queryByTestId("signup-name-hero", {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();

    await fireEvent.press(view.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("saves normalized name once and keeps non-secret draft bounded", async () => {
    const onContinue = jest.fn();
    const view = await renderNameScreen({ onContinue });

    await fireEvent.changeText(
      view.getByLabelText("Full name"),
      "  Maya Frames  ",
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
    });

    await waitFor(async () =>
      expect(
        await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY),
      ).not.toBeNull(),
    );
    const persisted = await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    expect(persisted).toContain("Maya Frames");
    expect(persisted).not.toContain("password");
    expect(persisted).not.toContain("token");
  });
});

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
