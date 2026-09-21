import { LoadingState } from "@35mm/mobile-ui";
import { Button, Screen, TextField } from "../components/controls";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { SignupStepScaffold } from "@/features/auth/signup/SignupStepScaffold";
import {
  DISPLAY_NAME_MAX_LENGTH,
  validateSignupDisplayName,
} from "@/features/auth/signup/validation";

export interface SignupNameScreenProps {
  readonly onBack: () => void;
  readonly onContinue: () => void;
}

export function SignupNameScreen({
  onBack,
  onContinue,
}: SignupNameScreenProps) {
  const displayName = useSignupDraftStore((state) => state.displayName);
  const username = useSignupDraftStore((state) => state.username);
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const setIdentityDraft = useSignupDraftStore(
    (state) => state.setIdentityDraft,
  );
  const continueLockRef = useRef(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const validation = useMemo(
    () => validateSignupDisplayName(displayName),
    [displayName],
  );
  const canContinue = validation.value !== null && !isContinuing;

  useEffect(() => {
    if (hasHydrated) return;
    void useSignupDraftStore.persist.rehydrate();
  }, [hasHydrated]);

  if (!hasHydrated) {
    return (
      <Screen testID="signup-name-loading">
        <StatusBar style="dark" />
        <LoadingState label="Restoring signup details" />
      </Screen>
    );
  }

  const continueToUsername = () => {
    setShowValidation(true);
    if (!canContinue || !validation.value || continueLockRef.current) return;
    continueLockRef.current = true;
    setIsContinuing(true);
    setIdentityDraft(validation.value, username);
    onContinue();
  };

  const displayNameError =
    (showValidation || displayName.length > 0) && validation.error
      ? validation.error
      : undefined;

  return (
    <SignupStepScaffold
      headline="What's your name?"
      onBack={onBack}
      step={1}
      stepName="Name"
      subtitle="This appears on your 35mm profile."
      testID="signup-name-screen"
    >
      <TextField
        autoFocus
        autoCapitalize="words"
        autoComplete="name"
        enterKeyHint="next"
        label="Full name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        onChangeText={(value) => setIdentityDraft(value, username)}
        onSubmitEditing={continueToUsername}
        placeholder="Your name"
        returnKeyType="next"
        textContentType="name"
        value={displayName}
        {...(displayNameError ? { errorMessage: displayNameError } : {})}
      />

      <Button
        accessibilityHint="Save your name and continue to username"
        disabled={!canContinue}
        fullWidth
        icon="chevron-right"
        iconPosition="trailing"
        label="Continue"
        loading={isContinuing}
        onPress={continueToUsername}
        size="large"
        testID="signup-name-continue"
      />
    </SignupStepScaffold>
  );
}
