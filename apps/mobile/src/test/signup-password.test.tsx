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
import { SignupPasswordScreen } from "@/features/auth/signup/SignupPasswordScreen";
import {
  PASSWORD_MIN_LENGTH,
  validateSignupPassword,
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

async function renderPasswordScreen(
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
      <SignupPasswordScreen
        onBack={overrides.onBack ?? jest.fn()}
        onContinue={overrides.onContinue ?? jest.fn()}
      />
    </Providers>,
  );
  await waitFor(() =>
    expect(view.getByTestId("signup-password-screen")).toBeOnTheScreen(),
  );
  return view;
}

describe("signup Password contracts", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await act(() => {
      resetSignupDraftState();
    });
  });

  it("validates length and exact confirmation without normalizing secrets", () => {
    const longPassword = "x".repeat(128);
    expect(validateSignupPassword("short", "short")).toEqual({
      passwordError: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      confirmationError: null,
      value: null,
    });
    expect(
      validateSignupPassword("🎬".repeat(7), "🎬".repeat(7)),
    ).toMatchObject({
      passwordError: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      value: null,
    });
    expect(validateSignupPassword("correct horse", "correct horse!")).toEqual({
      passwordError: null,
      confirmationError: "Passwords do not match",
      value: null,
    });
    expect(validateSignupPassword("correct horse", "correct horse")).toEqual({
      passwordError: null,
      confirmationError: null,
      value: {
        password: "correct horse",
        confirmation: "correct horse",
      },
    });
    expect(validateSignupPassword(longPassword, longPassword).value).toEqual({
      password: longPassword,
      confirmation: longPassword,
    });
  });

  it("renders step semantics, password-manager metadata, and back navigation", async () => {
    const onBack = jest.fn();
    const view = await renderPasswordScreen({ onBack });

    expect(
      view.getByRole("header", { name: "Lock in your login." }),
    ).toBeOnTheScreen();
    expect(view.getByTestId("signup-progress")).toHaveProp(
      "accessibilityValue",
      { min: 1, max: 5, now: 3 },
    );
    const password = view.getByLabelText("Password");
    const confirmation = view.getByLabelText("Confirm password");
    expect(password).toHaveProp("autoComplete", "new-password");
    expect(password).toHaveProp("textContentType", "newPassword");
    expect(password).toHaveProp("passwordRules", "minlength: 8;");
    expect(password).toHaveProp("secureTextEntry", true);
    expect(confirmation).toHaveProp("returnKeyType", "done");
    expect(
      view.getByLabelText(
        "Password requirements. Not met: 8 or more characters. Not met: passwords match.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(view.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("toggles each secret independently with accessible state labels", async () => {
    const view = await renderPasswordScreen();
    const password = view.getByLabelText("Password");
    const confirmation = view.getByLabelText("Confirm password");

    await fireEvent.press(
      view.getByRole("button", { name: "Show password" }),
    );
    expect(password).toHaveProp("secureTextEntry", false);
    expect(
      view.getByRole("button", { name: "Hide password" }),
    ).toHaveProp("accessibilityState", {
      disabled: false,
      selected: true,
    });
    expect(confirmation).toHaveProp("secureTextEntry", true);

    await fireEvent.press(
      view.getByRole("button", { name: "Show confirm password" }),
    );
    expect(confirmation).toHaveProp("secureTextEntry", false);
    expect(
      view.getByRole("button", { name: "Hide confirm password" }),
    ).toHaveProp("accessibilityState", {
      disabled: false,
      selected: true,
    });
  });

  it("announces invalid confirmation and blocks invalid submission", async () => {
    const onContinue = jest.fn();
    const view = await renderPasswordScreen({ onContinue });

    await fireEvent.changeText(
      view.getByLabelText("Password"),
      "correct horse",
    );
    await fireEvent.changeText(
      view.getByLabelText("Confirm password"),
      "wrong horse",
    );

    const error = view.getByText("Passwords do not match");
    expect(error).toHaveProp("accessibilityLiveRegion", "polite");
    expect(view.getByRole("button", { name: "Continue" })).toBeDisabled();
    await fireEvent(view.getByLabelText("Confirm password"), "submitEditing");
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("continues once with an in-memory password and preserves it on back navigation", async () => {
    const onContinue = jest.fn();
    const view = await renderPasswordScreen({ onContinue });

    await fireEvent.changeText(
      view.getByLabelText("Password"),
      "correct horse",
    );
    await fireEvent.changeText(
      view.getByLabelText("Confirm password"),
      "correct horse",
    );
    expect(
      view.getByLabelText(
        "Password requirements. Met: 8 or more characters. Met: passwords match.",
      ),
    ).toBeOnTheScreen();

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
    expect(useSignupDraftStore.getState()).toMatchObject({
      password: "correct horse",
      passwordConfirmation: "correct horse",
    });
  });

  it("never persists secrets and requires re-entry after process recreation", async () => {
    useSignupDraftStore.getState().setIdentityDraft("Maya Frames", "maya");
    useSignupDraftStore
      .getState()
      .setEmailDraft("maya.frames@example.com");
    useSignupDraftStore
      .getState()
      .setPasswordDraft("correct horse", "correct horse");

    await waitFor(async () =>
      expect(
        await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY),
      ).not.toBeNull(),
    );
    const persisted = await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    expect(persisted).toContain("maya.frames@example.com");
    expect(persisted).not.toContain("correct horse");
    expect(persisted).not.toContain("passwordConfirmation");

    useSignupDraftStore.setState({
      displayName: "",
      username: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      hasHydrated: false,
    });
    if (persisted) {
      await AsyncStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, persisted);
    }
    await useSignupDraftStore.persist.rehydrate();

    expect(useSignupDraftStore.getState()).toMatchObject({
      displayName: "Maya Frames",
      username: "maya",
      email: "maya.frames@example.com",
      password: "",
      passwordConfirmation: "",
      hasHydrated: true,
    });
  });
});
