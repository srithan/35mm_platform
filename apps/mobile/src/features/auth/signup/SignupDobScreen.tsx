import {
  Button,
  InlineNotice,
  LoadingState,
  Screen,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";

import type { SignupAccountInput } from "@/features/auth/signup/clerk";
import { signupFlowErrorMessage } from "@/features/auth/signup/clerk";
import {
  useSignupDraftStore,
} from "@/features/auth/signup/draft";
import {
  SignupDateOfBirthField,
} from "@/features/auth/signup/SignupDateOfBirthField";
import { SignupStepScaffold } from "@/features/auth/signup/SignupStepScaffold";
import {
  signupDateOfBirthInputFromValue,
  validateSignupDateOfBirth,
  validateSignupEmail,
  validateSignupIdentity,
  validateSignupPassword,
  type SignupDateOfBirthInput,
} from "@/features/auth/signup/validation";

export interface SignupDobScreenProps {
  readonly canResumeAccountAttempt: boolean;
  readonly isAuthReady: boolean;
  readonly locale?: string;
  readonly onBack: () => void;
  readonly onCreateAccount: (
    input: SignupAccountInput,
    onAccountCreated: () => void,
  ) => Promise<void>;
  readonly onContinue: () => void;
  readonly today?: string;
}

export function SignupDobScreen({
  canResumeAccountAttempt,
  isAuthReady,
  locale,
  onBack,
  onCreateAccount,
  onContinue,
  today,
}: SignupDobScreenProps) {
  const displayName = useSignupDraftStore((state) => state.displayName);
  const username = useSignupDraftStore((state) => state.username);
  const email = useSignupDraftStore((state) => state.email);
  const password = useSignupDraftStore((state) => state.password);
  const passwordConfirmation = useSignupDraftStore(
    (state) => state.passwordConfirmation,
  );
  const dateOfBirth = useSignupDraftStore((state) => state.dateOfBirth);
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const setDateOfBirthDraft = useSignupDraftStore(
    (state) => state.setDateOfBirthDraft,
  );
  const clearPasswordDraft = useSignupDraftStore(
    (state) => state.clearPasswordDraft,
  );
  const restoredRef = useRef(false);
  const continueLockRef = useRef(false);
  const mountedRef = useRef(true);
  const [accountCreated, setAccountCreated] = useState(false);
  const [dateInput, setDateInput] = useState<SignupDateOfBirthInput>(() =>
    signupDateOfBirthInputFromValue(dateOfBirth),
  );
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const identityValidation = useMemo(
    () => validateSignupIdentity(displayName, username),
    [displayName, username],
  );
  const emailValidation = useMemo(
    () => validateSignupEmail(email),
    [email],
  );
  const passwordValidation = useMemo(
    () => validateSignupPassword(password, passwordConfirmation),
    [password, passwordConfirmation],
  );
  const dateValidation = useMemo(
    () => validateSignupDateOfBirth(dateInput, today),
    [dateInput, today],
  );
  const canUseExistingAttempt =
    accountCreated || canResumeAccountAttempt;
  const priorDetailsReady =
    identityValidation.value !== null &&
    emailValidation.value !== null &&
    (passwordValidation.value !== null || canUseExistingAttempt);
  const canSubmit =
    isAuthReady &&
    priorDetailsReady &&
    dateValidation.value !== null &&
    !isSubmitting;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasHydrated) return;
    void useSignupDraftStore.persist.rehydrate();
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || restoredRef.current) return;
    restoredRef.current = true;
    setDateInput(signupDateOfBirthInputFromValue(dateOfBirth));
  }, [dateOfBirth, hasHydrated]);

  if (!hasHydrated) {
    return (
      <Screen testID="signup-dob-loading">
        <StatusBar style="dark" />
        <LoadingState label="Restoring signup details" />
      </Screen>
    );
  }

  const createAccount = async () => {
    setShowValidation(true);
    setFormError(null);
    if (
      !canSubmit ||
      !identityValidation.value ||
      !emailValidation.value ||
      !dateValidation.value ||
      continueLockRef.current
    ) {
      return;
    }

    continueLockRef.current = true;
    setIsSubmitting(true);
    setDateOfBirthDraft(dateValidation.value);
    try {
      await onCreateAccount(
        {
          ...identityValidation.value,
          email: emailValidation.value,
          password: passwordValidation.value?.password ?? "",
          dateOfBirth: dateValidation.value,
        },
        () => {
          clearPasswordDraft();
          if (mountedRef.current) setAccountCreated(true);
        },
      );
      if (mountedRef.current) onContinue();
    } catch (error) {
      if (mountedRef.current) {
        setFormError(signupFlowErrorMessage(error));
        setIsSubmitting(false);
        continueLockRef.current = false;
      }
    }
  };

  const priorDetailsMessage =
    identityValidation.value === null || emailValidation.value === null
      ? "Return to the earlier signup steps and complete your profile details."
      : passwordValidation.value === null && !canUseExistingAttempt
        ? "Return to Password and re-enter your password to continue."
        : null;
  const dateError =
    showValidation && dateValidation.error
      ? dateValidation.error
      : undefined;

  return (
    <SignupStepScaffold
      headline={"When did your\nstory begin?"}
      onBack={onBack}
      step={4}
      stepName="Date of birth"
      subtitle="We use this privately for account eligibility and safety."
      testID="signup-dob-screen"
    >
      <SignupDateOfBirthField
        onChange={(value) => {
          setDateInput(value);
          setFormError(null);
        }}
        onSubmit={() => {
          void createAccount();
        }}
        value={dateInput}
        {...(dateError ? { errorMessage: dateError } : {})}
        {...(locale ? { locale } : {})}
      />

      {priorDetailsMessage ? (
        <InlineNotice
          message={priorDetailsMessage}
          title="Earlier details needed"
          tone="warning"
          testID="signup-dob-prior-details"
        />
      ) : null}
      {formError ? (
        <InlineNotice
          accessibilityLiveRegion="assertive"
          message={formError}
          title="Account not created"
          tone="error"
          testID="signup-dob-error"
        />
      ) : null}

      <Button
        accessibilityHint="Create your Clerk account and send an email verification code"
        disabled={!canSubmit}
        fullWidth
        icon="chevron-right"
        iconPosition="trailing"
        label="Create account"
        loading={isSubmitting}
        onPress={() => {
          void createAccount();
        }}
        size="large"
        testID="signup-dob-continue"
      />
    </SignupStepScaffold>
  );
}
