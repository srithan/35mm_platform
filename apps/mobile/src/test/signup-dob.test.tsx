import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiClient } from "@35mm/api-client";
import {
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

import {
  canResumeEmailCodeSignUp,
  SignupFlowError,
  startEmailCodeSignUp,
  type SignupAccountInput,
} from "@/features/auth/signup/clerk";
import {
  resetSignupDraftState,
  SIGNUP_DRAFT_STORAGE_KEY,
  useSignupDraftStore,
} from "@/features/auth/signup/draft";
import {
  persistVerifiedSignupDateOfBirth,
} from "@/features/auth/signup/postVerification";
import {
  dateOfBirthFieldOrder,
} from "@/features/auth/signup/SignupDateOfBirthField";
import { SignupDobScreen } from "@/features/auth/signup/SignupDobScreen";
import {
  signupDateOfBirthInputFromValue,
  validateSignupDateOfBirth,
} from "@/features/auth/signup/validation";

jest.mock("@clerk/expo", () => ({
  isClerkAPIResponseError: () => false,
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const SIGNUP_INPUT = {
  displayName: "Maya Frames",
  username: "maya.frames",
  email: "maya.frames@example.com",
  password: "correct horse",
  dateOfBirth: "2000-02-29",
} as const;

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

async function prepareCompleteDraft(includePassword = true) {
  await act(() => {
    const draft = useSignupDraftStore.getState();
    draft.setIdentityDraft(SIGNUP_INPUT.displayName, SIGNUP_INPUT.username);
    draft.setEmailDraft(SIGNUP_INPUT.email);
    if (includePassword) {
      draft.setPasswordDraft(SIGNUP_INPUT.password, SIGNUP_INPUT.password);
    }
    useSignupDraftStore.setState({ hasHydrated: true });
  });
}

async function renderDobScreen(
  overrides: {
    readonly canResumeAccountAttempt?: boolean;
    readonly onContinue?: () => void;
    readonly onCreateAccount?: (
      input: SignupAccountInput,
      onAccountCreated: () => void,
    ) => Promise<void>;
  } = {},
) {
  const view = await render(
    <Providers>
      <SignupDobScreen
        canResumeAccountAttempt={
          overrides.canResumeAccountAttempt ?? false
        }
        isAuthReady
        onBack={jest.fn()}
        onContinue={overrides.onContinue ?? jest.fn()}
        onCreateAccount={overrides.onCreateAccount ?? jest.fn()}
        today="2026-07-24"
      />
    </Providers>,
  );
  await waitFor(() =>
    expect(view.getByTestId("signup-dob-screen")).toBeOnTheScreen(),
  );
  return view;
}

async function fillLeapDay(
  view: Awaited<ReturnType<typeof renderDobScreen>>,
) {
  await fireEvent.changeText(view.getByLabelText("Month"), "02");
  await fireEvent.changeText(view.getByLabelText("Day"), "29");
  await fireEvent.changeText(view.getByLabelText("Year"), "2000");
}

function resumableSignUp(
  prepareEmailAddressVerification = jest.fn().mockResolvedValue(undefined),
): SignUpResource {
  return {
    status: "missing_requirements",
    hasPassword: true,
    emailAddress: SIGNUP_INPUT.email,
    username: SIGNUP_INPUT.username,
    firstName: "Maya",
    lastName: "Frames",
    unverifiedFields: ["email_address"],
    create: jest.fn(),
    prepareEmailAddressVerification,
  } as unknown as SignUpResource;
}

type FetchMock = jest.Mock<
  Promise<Response>,
  [input: URL | RequestInfo, init: RequestInit | undefined]
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
    createRequestId: () => "request-signup-dob",
    fetch: fetchImpl as typeof globalThis.fetch,
    getToken: () => "verified-session-token",
    platform: {
      platform: "ios",
      appVariant: "development",
      appVersion: "0.1.0",
    },
  });
}

describe("signup DOB contracts", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await act(() => {
      resetSignupDraftState();
    });
  });

  it("uses locale field order and canonical calendar validation", () => {
    expect(dateOfBirthFieldOrder("en-US")).toEqual([
      "month",
      "day",
      "year",
    ]);
    expect(dateOfBirthFieldOrder("en-GB")).toEqual([
      "day",
      "month",
      "year",
    ]);
    expect(
      validateSignupDateOfBirth(
        { month: "2", day: "29", year: "2000" },
        "2026-07-24",
      ),
    ).toEqual({ error: null, value: "2000-02-29" });
    expect(
      validateSignupDateOfBirth(
        { month: "2", day: "29", year: "2025" },
        "2026-07-24",
      ),
    ).toMatchObject({ value: null });
    expect(
      validateSignupDateOfBirth(
        { month: "7", day: "25", year: "2026" },
        "2026-07-24",
      ),
    ).toEqual({
      error: "Date of birth cannot be in the future",
      value: null,
    });
    expect(signupDateOfBirthInputFromValue("2000-02-09")).toEqual({
      month: "02",
      day: "09",
      year: "2000",
    });
  });

  it("renders date semantics and creates once without persisting secrets", async () => {
    await prepareCompleteDraft();
    const onContinue = jest.fn();
    const onCreateAccount = jest.fn(
      async (
        input: SignupAccountInput,
        onAccountCreated: () => void,
      ) => {
        expect(input).toEqual(SIGNUP_INPUT);
        onAccountCreated();
      },
    );
    const view = await renderDobScreen({
      onContinue,
      onCreateAccount,
    });

    expect(view.getByTestId("signup-progress")).toHaveProp(
      "accessibilityValue",
      { min: 1, max: 5, now: 4 },
    );
    expect(view.getByLabelText("Month")).toHaveProp(
      "autoComplete",
      "birthdate-month",
    );
    expect(view.getByLabelText("Year")).toHaveProp(
      "textContentType",
      "birthdateYear",
    );

    await fillLeapDay(view);
    const submit = view.getByRole("button", { name: "Create account" });
    expect(submit).toBeEnabled();
    await fireEvent.press(submit);
    await fireEvent.press(submit);

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(useSignupDraftStore.getState()).toMatchObject({
      dateOfBirth: "2000-02-29",
      password: "",
      passwordConfirmation: "",
    });
    await waitFor(async () => {
      const persisted = await AsyncStorage.getItem(
        SIGNUP_DRAFT_STORAGE_KEY,
      );
      expect(persisted).toContain("2000-02-29");
      expect(persisted).not.toContain(SIGNUP_INPUT.password);
    });
  });

  it("retains DOB and unlocks an explicit retry after a safe failure", async () => {
    await prepareCompleteDraft();
    const onContinue = jest.fn();
    const onCreateAccount = jest
      .fn()
      .mockRejectedValueOnce(
        new SignupFlowError(
          "SIGNUP_RATE_LIMITED",
          "Too many attempts. Wait a moment, then try again.",
        ),
      )
      .mockImplementationOnce(
        async (
          _input: SignupAccountInput,
          onAccountCreated: () => void,
        ) => {
          onAccountCreated();
        },
      );
    const view = await renderDobScreen({
      onContinue,
      onCreateAccount,
    });

    await fillLeapDay(view);
    await fireEvent.press(
      view.getByRole("button", { name: "Create account" }),
    );
    expect(
      await view.findByText(
        "Too many attempts. Wait a moment, then try again.",
      ),
    ).toBeOnTheScreen();
    expect(view.getByLabelText("Year")).toHaveProp("value", "2000");

    await fireEvent.press(
      view.getByRole("button", { name: "Create account" }),
    );
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    expect(onCreateAccount).toHaveBeenCalledTimes(2);
  });

  it("continues a matching Clerk attempt after process recreation", async () => {
    await prepareCompleteDraft(false);
    useSignupDraftStore.getState().setDateOfBirthDraft("2000-02-29");
    const onCreateAccount = jest.fn(
      async (
        input: SignupAccountInput,
        onAccountCreated: () => void,
      ) => {
        expect(input.password).toBe("");
        onAccountCreated();
      },
    );
    const onContinue = jest.fn();
    const view = await renderDobScreen({
      canResumeAccountAttempt: true,
      onCreateAccount,
      onContinue,
    });

    expect(view.getByLabelText("Month")).toHaveProp("value", "02");
    await fireEvent.press(
      view.getByRole("button", { name: "Create account" }),
    );
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
  });

  it("keeps DOB out of Clerk data and prepares email-code verification", async () => {
    const prepareEmailAddressVerification = jest
      .fn()
      .mockResolvedValue(undefined);
    const createdAttempt = resumableSignUp(
      prepareEmailAddressVerification,
    );
    const signUp = {
      status: null,
      hasPassword: false,
      emailAddress: null,
      username: null,
      firstName: null,
      lastName: null,
      unverifiedFields: [],
      create: jest.fn().mockResolvedValue(createdAttempt),
    } as unknown as SignUpResource;
    const onAccountCreated = jest.fn();

    await startEmailCodeSignUp(
      signUp,
      SIGNUP_INPUT,
      onAccountCreated,
    );

    expect(signUp.create).toHaveBeenCalledWith({
      emailAddress: SIGNUP_INPUT.email,
      firstName: "Maya",
      lastName: "Frames",
      password: SIGNUP_INPUT.password,
      username: SIGNUP_INPUT.username,
    });
    expect(signUp.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        unsafeMetadata: expect.anything(),
      }),
    );
    expect(prepareEmailAddressVerification).toHaveBeenCalledWith({
      strategy: "email_code",
    });
    expect(onAccountCreated).toHaveBeenCalledTimes(1);
  });

  it("resumes only an exact Clerk attempt and clears the memory secret", async () => {
    const prepare = jest.fn().mockResolvedValue(undefined);
    const signUp = resumableSignUp(prepare);
    const onAccountCreated = jest.fn();

    expect(canResumeEmailCodeSignUp(signUp, SIGNUP_INPUT)).toBe(true);
    await startEmailCodeSignUp(
      signUp,
      { ...SIGNUP_INPUT, password: "" },
      onAccountCreated,
    );

    expect(signUp.create).not.toHaveBeenCalled();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(onAccountCreated).toHaveBeenCalledTimes(1);
    expect(
      canResumeEmailCodeSignUp(signUp, {
        ...SIGNUP_INPUT,
        email: "different@example.com",
      }),
    ).toBe(false);
  });

  it("persists DOB only through the verified authenticated API sequence", async () => {
    const requests: {
      readonly url: string;
      readonly init: RequestInit | undefined;
    }[] = [];
    const fetchImpl: FetchMock = jest.fn(async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.endsWith("/v1/me")) {
        return response({
          userId: "user_35mm",
          username: SIGNUP_INPUT.username,
          displayName: SIGNUP_INPUT.displayName,
          avatarUrl: null,
          avatarUrlLg: null,
          role: null,
          roleContext: null,
          filmsLoggedCount: 0,
          followerCount: 0,
          followingCount: 0,
        });
      }
      if (url.endsWith("/v1/profiles/me")) {
        return response({
          ok: true,
          profile: { dateOfBirth: SIGNUP_INPUT.dateOfBirth },
        });
      }
      return response({ completed: false, completedAt: null });
    });
    const controller = new AbortController();

    const result = await persistVerifiedSignupDateOfBirth(
      createClient(fetchImpl),
      {
        dateOfBirth: SIGNUP_INPUT.dateOfBirth,
        idempotencyKey: "signup-dob-user_35mm",
        signal: controller.signal,
      },
    );

    expect(result).toMatchObject({
      dateOfBirth: SIGNUP_INPUT.dateOfBirth,
      onboarding: { completed: false, completedAt: null },
      profile: { userId: "user_35mm" },
    });
    expect(requests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/v1/me",
      "/v1/profiles/me",
      "/v1/me/onboarding-status",
    ]);
    const patch = requests[1]?.init;
    expect(patch?.method).toBe("PATCH");
    expect(patch?.body).toBe(
      JSON.stringify({ dateOfBirth: SIGNUP_INPUT.dateOfBirth }),
    );
    const headers = new Headers(patch?.headers);
    expect(headers.get("Authorization")).toBe(
      "Bearer verified-session-token",
    );
    expect(headers.get("Idempotency-Key")).toBe(
      "signup-dob-user_35mm",
    );
  });
});
