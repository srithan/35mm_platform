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
import { SignupEmailScreen } from "@/features/auth/signup/SignupEmailScreen";
import { validateSignupEmail } from "@/features/auth/signup/validation";

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

async function renderEmailScreen(
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
      <SignupEmailScreen
        onBack={overrides.onBack ?? jest.fn()}
        onContinue={overrides.onContinue ?? jest.fn()}
      />
    </Providers>,
  );
  await waitFor(() =>
    expect(view.getByTestId("signup-email-screen")).toBeOnTheScreen(),
  );
  return view;
}

describe("signup Email contracts", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await act(() => {
      resetSignupDraftState();
    });
  });

  it("normalizes email addresses through the focused shared contract", () => {
    expect(validateSignupEmail("  MAYA.Frames@Example.COM  ")).toEqual({
      error: null,
      value: "maya.frames@example.com",
    });
    expect(validateSignupEmail("not-an-email")).toEqual({
      error: "Enter a valid email address",
      value: null,
    });
    expect(validateSignupEmail("   ")).toEqual({
      error: "Enter your email address",
      value: null,
    });
  });

  it("renders shared step semantics, email input metadata, and preserved back navigation", async () => {
    const onBack = jest.fn();
    const view = await renderEmailScreen({ onBack });

    expect(
      view.getByRole("header", { name: "Where should we send it?" }),
    ).toBeOnTheScreen();
    expect(view.getByTestId("signup-progress")).toHaveProp(
      "accessibilityValue",
      { min: 1, max: 5, now: 2 },
    );
    const emailInput = view.getByLabelText("Email");
    expect(emailInput).toHaveProp("autoComplete", "email");
    expect(emailInput).toHaveProp("keyboardType", "email-address");
    expect(emailInput).toHaveProp("returnKeyType", "next");
    expect(emailInput).toHaveProp("textContentType", "emailAddress");
    expect(
      view.getByTestId("signup-email-hero", {
        includeHiddenElements: true,
      }),
    ).toHaveProp("accessible", false);

    await fireEvent.press(view.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("announces invalid input and never continues with an invalid address", async () => {
    const onContinue = jest.fn();
    const view = await renderEmailScreen({ onContinue });

    await fireEvent.changeText(view.getByLabelText("Email"), "wrong@");

    const error = view.getByText("Enter a valid email address");
    expect(error).toHaveProp("accessibilityLiveRegion", "polite");
    const continueButton = view.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();
    await fireEvent(view.getByLabelText("Email"), "submitEditing");
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("saves one normalized address and blocks duplicate Continue actions", async () => {
    const onContinue = jest.fn();
    const view = await renderEmailScreen({ onContinue });

    await fireEvent.changeText(
      view.getByLabelText("Email"),
      "  MAYA.Frames@Example.COM  ",
    );
    const continueButton = view.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeEnabled();

    await fireEvent.press(continueButton);
    await fireEvent.press(
      view.getByRole("button", {
        name: "Continue",
        includeHiddenElements: true,
      }),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(useSignupDraftStore.getState().email).toBe(
      "maya.frames@example.com",
    );
  });

  it("migrates identity-only drafts and restores bounded non-secret email", async () => {
    useSignupDraftStore.setState({
      displayName: "",
      username: "",
      email: "",
      hasHydrated: false,
    });
    await AsyncStorage.setItem(
      SIGNUP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        state: {
          displayName: "Maya Frames",
          username: "maya.frames",
        },
        version: 1,
      }),
    );
    await useSignupDraftStore.persist.rehydrate();

    expect(useSignupDraftStore.getState()).toMatchObject({
      displayName: "Maya Frames",
      username: "maya.frames",
      email: "",
      hasHydrated: true,
    });

    useSignupDraftStore
      .getState()
      .setEmailDraft("maya.frames@example.com");
    await waitFor(async () =>
      expect(
        await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY),
      ).not.toBeNull(),
    );
    const persisted = await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    expect(persisted).toContain("maya.frames@example.com");
    expect(persisted).not.toContain("password");
    expect(persisted).not.toContain("token");
    expect(persisted).not.toContain("verificationCode");

    useSignupDraftStore.setState({
      displayName: "",
      username: "",
      email: "",
      hasHydrated: false,
    });
    if (persisted) {
      await AsyncStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, persisted);
    }
    await useSignupDraftStore.persist.rehydrate();

    expect(useSignupDraftStore.getState()).toMatchObject({
      displayName: "Maya Frames",
      username: "maya.frames",
      email: "maya.frames@example.com",
      hasHydrated: true,
    });
  });
});
