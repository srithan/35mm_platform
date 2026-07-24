import {
  Button,
  LoadingState,
  Screen,
  TextField,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { SignupStepScaffold } from "@/features/auth/signup/SignupStepScaffold";
import {
  EMAIL_ADDRESS_MAX_LENGTH,
  validateSignupEmail,
} from "@/features/auth/signup/validation";

export interface SignupEmailScreenProps {
  readonly onBack: () => void;
  readonly onContinue: () => void;
}

export function SignupEmailScreen({
  onBack,
  onContinue,
}: SignupEmailScreenProps) {
  const email = useSignupDraftStore((state) => state.email);
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const setEmailDraft = useSignupDraftStore((state) => state.setEmailDraft);
  const continueLockRef = useRef(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const validation = useMemo(() => validateSignupEmail(email), [email]);
  const canContinue = validation.value !== null && !isContinuing;

  useEffect(() => {
    if (hasHydrated) return;
    void useSignupDraftStore.persist.rehydrate();
  }, [hasHydrated]);

  if (!hasHydrated) {
    return (
      <Screen testID="signup-email-loading">
        <StatusBar style="dark" />
        <LoadingState label="Restoring signup details" />
      </Screen>
    );
  }

  const continueToPassword = () => {
    setShowValidation(true);
    if (!canContinue || !validation.value || continueLockRef.current) return;
    continueLockRef.current = true;
    setIsContinuing(true);
    setEmailDraft(validation.value);
    onContinue();
  };

  const emailError =
    (showValidation || email.length > 0) && validation.error
      ? validation.error
      : undefined;

  return (
    <SignupStepScaffold
      headline={"Where should\nwe send it?"}
      onBack={onBack}
      step={2}
      stepName="Email"
      subtitle="Use the email address you want tied to your 35mm account."
      testID="signup-email-screen"
    >
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        enterKeyHint="next"
        inputMode="email"
        keyboardType="email-address"
        label="Email"
        leadingIcon="mail"
        maxLength={EMAIL_ADDRESS_MAX_LENGTH}
        onChangeText={(value) => setEmailDraft(value.toLowerCase())}
        onSubmitEditing={continueToPassword}
        placeholder="you@example.com"
        returnKeyType="next"
        spellCheck={false}
        textContentType="emailAddress"
        value={email}
        {...(emailError ? { errorMessage: emailError } : {})}
        {...(emailError
          ? {}
          : {
              message:
                "We’ll use this for sign-in and email verification.",
            })}
      />

      <Button
        accessibilityHint="Save your email and continue to password"
        disabled={!canContinue}
        fullWidth
        icon="chevron-right"
        iconPosition="trailing"
        label="Continue"
        loading={isContinuing}
        onPress={continueToPassword}
        size="large"
        testID="signup-email-continue"
      />
    </SignupStepScaffold>
  );
}
