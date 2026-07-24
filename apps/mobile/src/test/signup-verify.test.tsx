import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppText,
  MobileUIProvider,
  SafeAreaProvider,
} from "@35mm/mobile-ui";
import type { SignUpResource } from "@clerk/expo/types";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import SignupVerifyRoute from "@/app/(auth)/signup/verify";
import {
  changeSignupEmailAddress,
  resendEmailCodeSignUp,
  verifyEmailCodeSignUp,
} from "@/features/auth/signup/clerk";
import {
  resetSignupDraftState,
  SIGNUP_DRAFT_STORAGE_KEY,
  useSignupDraftStore,
} from "@/features/auth/signup/draft";
import {
  shouldRecoverSignupCompletion,
  SignupCompletionRecoveryGate,
} from "@/features/auth/signup/SignupCompletionRecoveryGate";
import {
  EMAIL_RESEND_COOLDOWN_MS,
  emailResendSecondsRemaining,
  SignupVerifyScreen,
} from "@/features/auth/signup/SignupVerifyScreen";
import { persistVerifiedSignupDateOfBirth } from "@/features/auth/signup/postVerification";
import { useApiClient } from "@/services/api";

const mockUseAuth = jest.fn();
const mockUseSignUp = jest.fn();
const mockIsClerkAPIResponseError = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRedirect = jest.fn();

jest.mock("@clerk/expo", () => ({
  isClerkAPIResponseError: (error: unknown) =>
    mockIsClerkAPIResponseError(error),
  useAuth: () => mockUseAuth(),
}));
jest.mock("@clerk/expo/legacy", () => ({
  useSignUp: () => mockUseSignUp(),
}));
jest.mock("expo-router", () => ({
  Redirect: (props: unknown) => {
    mockRedirect(props);
    return null;
  },
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));
jest.mock("@/features/auth/signup/postVerification", () => ({
  persistVerifiedSignupDateOfBirth: jest.fn(),
}));
jest.mock("@/services/api", () => ({
  useApiClient: jest.fn(),
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const EMAIL = "maya.frames@example.com";
const USER_ID = "user_35mm_verified";

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

function incompleteSignUp(
  overrides: Partial<SignUpResource> = {},
): SignUpResource {
  return {
    status: "missing_requirements",
    emailAddress: EMAIL,
    unverifiedFields: ["email_address"],
    attemptEmailAddressVerification: jest.fn(),
    prepareEmailAddressVerification: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as SignUpResource;
}

async function prepareDraft() {
  await act(() => {
    const draft = useSignupDraftStore.getState();
    draft.setEmailDraft(EMAIL);
    draft.setDateOfBirthDraft("2000-02-29");
    useSignupDraftStore.setState({ hasHydrated: true });
  });
}

describe("signup email verification contracts", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsClerkAPIResponseError.mockReturnValue(false);
    await AsyncStorage.clear();
    await act(() => {
      resetSignupDraftState();
    });
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });
    jest.mocked(useApiClient).mockReturnValue({} as never);
    jest.mocked(persistVerifiedSignupDateOfBirth).mockResolvedValue({
      dateOfBirth: "2000-02-29",
      onboarding: { completed: false, completedAt: null },
      profile: {
        userId: USER_ID,
        username: "maya.frames",
        displayName: "Maya Frames",
        avatarUrl: null,
        avatarUrlLg: null,
        role: null,
        roleContext: null,
        filmsLoggedCount: 0,
        followerCount: 0,
        followingCount: 0,
      },
    });
  });

  it("sanitizes a pasted code, blocks duplicates, and exposes code semantics", async () => {
    await prepareDraft();
    let resolveVerification: (() => void) | undefined;
    const onVerify = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveVerification = resolve;
        }),
    );
    const view = await render(
      <Providers>
        <SignupVerifyScreen
          completionError={null}
          completionPending={false}
          isAuthReady
          isCompleting={false}
          now={() => 50_000}
          onBack={jest.fn()}
          onChangeEmail={jest.fn()}
          onResend={jest.fn()}
          onRetryCompletion={jest.fn()}
          onVerify={onVerify}
        />
      </Providers>,
    );

    expect(view.getByTestId("signup-progress")).toHaveProp(
      "accessibilityValue",
      { min: 1, max: 5, now: 5 },
    );
    const field = view.getByLabelText("Verification code");
    expect(field).toHaveProp("autoComplete", "one-time-code");
    expect(field).toHaveProp("textContentType", "oneTimeCode");

    await fireEvent.changeText(field, "12a34567");
    expect(field).toHaveProp("value", "123456");
    const submit = view.getByRole("button", { name: "Verify email" });
    await fireEvent.press(submit);
    await fireEvent.press(submit);
    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith("123456");

    await act(async () => {
      resolveVerification?.();
    });
  });

  it("enforces the resend cooldown", async () => {
    expect(emailResendSecondsRemaining(null, 10_000)).toBe(0);
    expect(
      emailResendSecondsRemaining(
        10_000,
        10_000 + EMAIL_RESEND_COOLDOWN_MS - 1,
      ),
    ).toBe(1);
    expect(
      emailResendSecondsRemaining(
        10_000,
        10_000 + EMAIL_RESEND_COOLDOWN_MS,
      ),
    ).toBe(0);

    await prepareDraft();
    useSignupDraftStore.getState().markEmailVerificationSent(10_000);
    const onResend = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <Providers>
        <SignupVerifyScreen
          completionError={null}
          completionPending={false}
          isAuthReady
          isCompleting={false}
          now={() => 11_000}
          onBack={jest.fn()}
          onChangeEmail={jest.fn()}
          onResend={onResend}
          onRetryCompletion={jest.fn()}
          onVerify={jest.fn()}
        />
      </Providers>,
    );

    expect(
      view.getByRole("button", { name: "Resend code in 29s" }),
    ).toBeDisabled();
    expect(onResend).not.toHaveBeenCalled();
  });

  it("sends one replacement code after the cooldown", async () => {
    await prepareDraft();
    const onResend = jest.fn().mockResolvedValue(undefined);
    const readyView = await render(
      <Providers>
        <SignupVerifyScreen
          completionError={null}
          completionPending={false}
          isAuthReady
          isCompleting={false}
          now={() => 50_000}
          onBack={jest.fn()}
          onChangeEmail={jest.fn()}
          onResend={onResend}
          onRetryCompletion={jest.fn()}
          onVerify={jest.fn()}
        />
      </Providers>,
    );
    await fireEvent.press(
      readyView.getByRole("button", { name: "Resend code" }),
    );
    await waitFor(() => expect(onResend).toHaveBeenCalledTimes(1));
    expect(
      await readyView.findByText(`A new code was sent to ${EMAIL}.`),
    ).toBeOnTheScreen();
  });

  it("validates change-email input and sends only the normalized address", async () => {
    await prepareDraft();
    const onChangeEmail = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <Providers>
        <SignupVerifyScreen
          completionError={null}
          completionPending={false}
          isAuthReady
          isCompleting={false}
          now={() => 50_000}
          onBack={jest.fn()}
          onChangeEmail={onChangeEmail}
          onResend={jest.fn()}
          onRetryCompletion={jest.fn()}
          onVerify={jest.fn()}
        />
      </Providers>,
    );

    await fireEvent.press(
      view.getByRole("button", { name: "Change email" }),
    );
    const emailField = view.getByLabelText("New email");
    await fireEvent.changeText(emailField, "NOT-AN-EMAIL");
    expect(
      view.getByRole("button", { name: "Send code to new email" }),
    ).toBeDisabled();

    await fireEvent.changeText(emailField, "New.Address@Example.COM ");
    await fireEvent.press(
      view.getByRole("button", { name: "Send code to new email" }),
    );
    await waitFor(() =>
      expect(onChangeEmail).toHaveBeenCalledWith(
        "new.address@example.com",
      ),
    );
    expect(
      await view.findByText(
        "A verification code was sent to new.address@example.com.",
      ),
    ).toBeOnTheScreen();
  });

  it("uses Clerk status results for verify, resend, and email replacement", async () => {
    const completed = incompleteSignUp({
      status: "complete",
      createdSessionId: "sess_verified",
      createdUserId: USER_ID,
    });
    const attemptEmailAddressVerification = jest
      .fn()
      .mockResolvedValue(completed);
    const prepareEmailAddressVerification = jest
      .fn()
      .mockResolvedValue(undefined);
    const changedAttempt = incompleteSignUp({
      emailAddress: "new.address@example.com",
      prepareEmailAddressVerification,
    });
    const onEmailChanged = jest.fn();
    const signUp = incompleteSignUp({
      attemptEmailAddressVerification,
      prepareEmailAddressVerification,
      update: jest.fn().mockResolvedValue(changedAttempt),
    });

    await expect(
      verifyEmailCodeSignUp(signUp, "123456"),
    ).resolves.toEqual({
      sessionId: "sess_verified",
      userId: USER_ID,
    });
    await resendEmailCodeSignUp(signUp);
    await changeSignupEmailAddress(
      signUp,
      "new.address@example.com",
      onEmailChanged,
    );

    expect(attemptEmailAddressVerification).toHaveBeenCalledWith({
      code: "123456",
    });
    expect(prepareEmailAddressVerification).toHaveBeenCalledWith({
      strategy: "email_code",
    });
    expect(signUp.update).toHaveBeenCalledWith({
      emailAddress: "new.address@example.com",
    });
    expect(onEmailChanged).toHaveBeenCalledTimes(1);
  });

  it("maps incorrect and expired Clerk codes to safe recovery messages", async () => {
    mockIsClerkAPIResponseError.mockReturnValue(true);
    const incorrect = incompleteSignUp({
      attemptEmailAddressVerification: jest.fn().mockRejectedValue({
        errors: [{ code: "form_code_incorrect" }],
      }),
    });
    const expired = incompleteSignUp({
      attemptEmailAddressVerification: jest.fn().mockRejectedValue({
        errors: [{ code: "form_code_past_expiration" }],
      }),
    });

    await expect(
      verifyEmailCodeSignUp(incorrect, "111111"),
    ).rejects.toMatchObject({
      code: "SIGNUP_CODE_INCORRECT",
      userMessage:
        "That code is incorrect. Check the email and try again.",
    });
    await expect(
      verifyEmailCodeSignUp(expired, "222222"),
    ).rejects.toMatchObject({
      code: "SIGNUP_CODE_EXPIRED",
      userMessage:
        "That code has expired. Send a new code and try again.",
    });
  });

  it("activates the verified session before the protected completion bridge", async () => {
    await prepareDraft();
    const setActive = jest.fn().mockResolvedValue(undefined);
    const completed = incompleteSignUp({
      status: "complete",
      createdSessionId: "sess_verified",
      createdUserId: USER_ID,
    });
    const signUp = incompleteSignUp({
      attemptEmailAddressVerification: jest
        .fn()
        .mockResolvedValue(completed),
    });
    mockUseSignUp.mockReturnValue({
      isLoaded: true,
      setActive,
      signUp,
    });
    const view = await render(
      <Providers>
        <SignupVerifyRoute />
      </Providers>,
    );

    await fireEvent.changeText(
      view.getByLabelText("Verification code"),
      "123456",
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Verify email" }),
    );

    await waitFor(() =>
      expect(persistVerifiedSignupDateOfBirth).toHaveBeenCalledTimes(1),
    );
    expect(setActive).toHaveBeenCalledWith({ session: "sess_verified" });
    expect(setActive.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(persistVerifiedSignupDateOfBirth).mock
        .invocationCallOrder[0]!,
    );
    expect(persistVerifiedSignupDateOfBirth).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dateOfBirth: "2000-02-29",
        idempotencyKey: `signup-date-of-birth:${USER_ID}`,
        signal: expect.any(AbortSignal),
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(useSignupDraftStore.getState()).toMatchObject({
      completionUserId: null,
      dateOfBirth: "",
      email: "",
    });
  });

  it("resumes protected completion from an active session without a SignUp resource", async () => {
    await prepareDraft();
    useSignupDraftStore.getState().markCompletionPending(USER_ID);
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: USER_ID,
    });
    mockUseSignUp.mockReturnValue({
      isLoaded: true,
      setActive: undefined,
      signUp: undefined,
    });

    await render(
      <Providers>
        <SignupVerifyRoute />
      </Providers>,
    );

    await waitFor(() =>
      expect(persistVerifiedSignupDateOfBirth).toHaveBeenCalledTimes(1),
    );
    expect(persistVerifiedSignupDateOfBirth).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        dateOfBirth: "2000-02-29",
        idempotencyKey: `signup-date-of-birth:${USER_ID}`,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("keeps verified completion explicit and retryable without back navigation", async () => {
    await prepareDraft();
    const onRetryCompletion = jest.fn();
    const view = await render(
      <Providers>
        <SignupVerifyScreen
          completionError="Profile completion failed."
          completionPending
          isAuthReady
          isCompleting={false}
          onBack={jest.fn()}
          onChangeEmail={jest.fn()}
          onResend={jest.fn()}
          onRetryCompletion={onRetryCompletion}
          onVerify={jest.fn()}
        />
      </Providers>,
    );

    expect(view.queryByRole("button", { name: "Back" })).toBeNull();
    expect(view.getByTestId("signup-completion-error")).toHaveProp(
      "accessibilityRole",
      "alert",
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Finish account setup" }),
    );
    expect(onRetryCompletion).toHaveBeenCalledTimes(1);
  });

  it("persists only bounded recovery metadata and targets the matching session", async () => {
    await prepareDraft();
    useSignupDraftStore.getState().markEmailVerificationSent(12_345);
    useSignupDraftStore.getState().markCompletionPending(USER_ID);
    await waitFor(async () =>
      expect(
        await AsyncStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY),
      ).not.toBeNull(),
    );
    const persisted = await AsyncStorage.getItem(
      SIGNUP_DRAFT_STORAGE_KEY,
    );

    expect(persisted).toContain(USER_ID);
    expect(persisted).toContain("12345");
    expect(persisted).not.toContain("123456");
    expect(persisted).not.toContain("verificationCode");
    expect(persisted).not.toContain("session");
    expect(persisted).not.toContain("token");
    expect(
      shouldRecoverSignupCompletion({
        isSignedIn: true,
        userId: USER_ID,
        completionUserId: USER_ID,
      }),
    ).toBe(true);
    expect(
      shouldRecoverSignupCompletion({
        isSignedIn: true,
        userId: "different_user",
        completionUserId: USER_ID,
      }),
    ).toBe(false);
  });

  it("redirects a matching active user into verified completion recovery", async () => {
    await prepareDraft();
    useSignupDraftStore.getState().markCompletionPending(USER_ID);
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: USER_ID,
    });
    const view = await render(
      <Providers>
        <SignupCompletionRecoveryGate>
          <AppText>Authenticated destination</AppText>
        </SignupCompletionRecoveryGate>
      </Providers>,
    );

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "./(auth)/signup/verify" }),
    );
    expect(view.queryByText("Authenticated destination")).toBeNull();
  });

  it("does not redirect a different active user into another signup draft", async () => {
    await prepareDraft();
    useSignupDraftStore.getState().markCompletionPending(USER_ID);
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "different_user",
    });
    const view = await render(
      <Providers>
        <SignupCompletionRecoveryGate>
          <AppText>Authenticated destination</AppText>
        </SignupCompletionRecoveryGate>
      </Providers>,
    );

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(
      view.getByText("Authenticated destination"),
    ).toBeOnTheScreen();
  });
});
