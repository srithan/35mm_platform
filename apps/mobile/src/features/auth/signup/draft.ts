import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { reportMobileDiagnostic } from "@/services/diagnostics";
import {
  DISPLAY_NAME_MAX_LENGTH,
  DATE_OF_BIRTH_MAX_LENGTH,
  EMAIL_ADDRESS_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from "@/features/auth/signup/validation";

export const SIGNUP_DRAFT_STORAGE_KEY = "@35mm/mobile-signup-draft/v1";
const CLERK_USER_ID_MAX_LENGTH = 128;

interface SignupDraftState {
  readonly displayName: string;
  readonly username: string;
  readonly email: string;
  readonly dateOfBirth: string;
  readonly emailVerificationSentAt: number | null;
  readonly completionUserId: string | null;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly hasHydrated: boolean;
  readonly setIdentityDraft: (displayName: string, username: string) => void;
  readonly setEmailDraft: (email: string) => void;
  readonly setDateOfBirthDraft: (dateOfBirth: string) => void;
  readonly markEmailVerificationSent: (sentAt: number) => void;
  readonly markCompletionPending: (userId: string) => void;
  readonly setPasswordDraft: (
    password: string,
    passwordConfirmation: string,
  ) => void;
  readonly clearPasswordDraft: () => void;
  readonly clearDraft: () => void;
  readonly markHydrated: () => void;
}

const EMPTY_DRAFT = {
  displayName: "",
  username: "",
  email: "",
  dateOfBirth: "",
  emailVerificationSentAt: null,
  completionUserId: null,
  password: "",
  passwordConfirmation: "",
} as const;

function boundedDraftValue(value: unknown, maximumLength: number): string {
  return typeof value === "string" && value.length <= maximumLength ? value : "";
}

function boundedTimestamp(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function boundedClerkUserId(value: unknown): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= CLERK_USER_ID_MAX_LENGTH
    ? value
    : null;
}

export const useSignupDraftStore = create<SignupDraftState>()(
  persist(
    (set) => ({
      ...EMPTY_DRAFT,
      hasHydrated: false,
      setIdentityDraft: (displayName, username) =>
        set({
          displayName: displayName.slice(0, DISPLAY_NAME_MAX_LENGTH),
          username: username.slice(0, USERNAME_MAX_LENGTH),
        }),
      setEmailDraft: (email) =>
        set({
          email: email.slice(0, EMAIL_ADDRESS_MAX_LENGTH),
        }),
      setDateOfBirthDraft: (dateOfBirth) =>
        set({
          dateOfBirth: dateOfBirth.slice(0, DATE_OF_BIRTH_MAX_LENGTH),
        }),
      markEmailVerificationSent: (sentAt) =>
        set({
          emailVerificationSentAt: boundedTimestamp(sentAt),
        }),
      markCompletionPending: (userId) =>
        set({
          completionUserId: boundedClerkUserId(userId),
        }),
      setPasswordDraft: (password, passwordConfirmation) =>
        set({
          password,
          passwordConfirmation,
        }),
      clearPasswordDraft: () =>
        set({
          password: "",
          passwordConfirmation: "",
        }),
      clearDraft: () => set(EMPTY_DRAFT),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: SIGNUP_DRAFT_STORAGE_KEY,
      version: 4,
      skipHydration: true,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        displayName: state.displayName,
        username: state.username,
        email: state.email,
        dateOfBirth: state.dateOfBirth,
        emailVerificationSentAt: state.emailVerificationSentAt,
        completionUserId: state.completionUserId,
      }),
      migrate: (persisted, version) => {
        const draft = persisted as
          | {
              displayName?: unknown;
              username?: unknown;
              email?: unknown;
              dateOfBirth?: unknown;
              emailVerificationSentAt?: unknown;
              completionUserId?: unknown;
            }
          | null;
        if (version > 4) return EMPTY_DRAFT;
        return {
          displayName: boundedDraftValue(
            draft?.displayName,
            DISPLAY_NAME_MAX_LENGTH,
          ),
          username: boundedDraftValue(draft?.username, USERNAME_MAX_LENGTH),
          email: boundedDraftValue(draft?.email, EMAIL_ADDRESS_MAX_LENGTH),
          dateOfBirth: boundedDraftValue(
            draft?.dateOfBirth,
            DATE_OF_BIRTH_MAX_LENGTH,
          ),
          emailVerificationSentAt: boundedTimestamp(
            draft?.emailVerificationSentAt,
          ),
          completionUserId: boundedClerkUserId(draft?.completionUserId),
        };
      },
      merge: (persisted, current) => {
        const draft = persisted as
          | {
              displayName?: unknown;
              username?: unknown;
              email?: unknown;
              dateOfBirth?: unknown;
              emailVerificationSentAt?: unknown;
              completionUserId?: unknown;
            }
          | null;
        return {
          ...current,
          displayName: boundedDraftValue(
            draft?.displayName,
            DISPLAY_NAME_MAX_LENGTH,
          ),
          username: boundedDraftValue(draft?.username, USERNAME_MAX_LENGTH),
          email: boundedDraftValue(draft?.email, EMAIL_ADDRESS_MAX_LENGTH),
          dateOfBirth: boundedDraftValue(
            draft?.dateOfBirth,
            DATE_OF_BIRTH_MAX_LENGTH,
          ),
          emailVerificationSentAt: boundedTimestamp(
            draft?.emailVerificationSentAt,
          ),
          completionUserId: boundedClerkUserId(draft?.completionUserId),
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          reportMobileDiagnostic({
            source: "persistence",
            code: "SIGNUP_DRAFT_RESTORE_FAILED",
            operation: "signup-draft.restore",
          });
        }
        state?.markHydrated();
      },
    },
  ),
);

export function resetSignupDraftState(): void {
  useSignupDraftStore.setState({
    ...EMPTY_DRAFT,
    hasHydrated: true,
  });
}
