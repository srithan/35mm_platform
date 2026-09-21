import { Badge, LoadingState } from "@35mm/mobile-ui";
import { AppText, Button, Screen, TextField } from "../components/controls";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import type { UsernameAvailabilityClient } from "@/features/auth/signup/api";
import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { SignupStepScaffold } from "@/features/auth/signup/SignupStepScaffold";
import { useUsernameAvailability } from "@/features/auth/signup/useUsernameAvailability";
import {
  USERNAME_MAX_LENGTH,
  validateSignupUsername,
} from "@/features/auth/signup/validation";

export interface SignupUsernameScreenProps {
  readonly client: UsernameAvailabilityClient;
  readonly onBack: () => void;
  readonly onContinue: () => void;
}

export function SignupUsernameScreen({
  client,
  onBack,
  onContinue,
}: SignupUsernameScreenProps) {
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
    () => validateSignupUsername(username),
    [username],
  );
  const availability = useUsernameAvailability(client, username);
  const canContinue =
    validation.value !== null &&
    availability.status === "available" &&
    !isContinuing;

  useEffect(() => {
    if (hasHydrated) return;
    void useSignupDraftStore.persist.rehydrate();
  }, [hasHydrated]);

  if (!hasHydrated) {
    return (
      <Screen testID="signup-username-loading">
        <StatusBar style="dark" />
        <LoadingState label="Restoring signup details" />
      </Screen>
    );
  }

  const continueToEmail = () => {
    setShowValidation(true);
    if (!canContinue || !validation.value || continueLockRef.current) return;
    continueLockRef.current = true;
    setIsContinuing(true);
    setIdentityDraft(displayName, validation.value);
    onContinue();
  };

  const usernameError =
    showValidation && validation.error
      ? validation.error
      : availability.status === "invalid" ||
          availability.status === "unavailable" ||
          availability.status === "error"
        ? availability.message
        : undefined;
  const usernameMessage =
    username.length === 0
      ? "Letters, numbers, dots and underscores only"
      : availability.status === "checking"
        ? "Checking availability..."
        : availability.status === "available"
          ? `35mm/${validation.value ?? username} is available`
          : undefined;

  return (
    <SignupStepScaffold
      headline="Choose your username."
      onBack={onBack}
      step={2}
      stepName="Username"
      subtitle="People can find you at this @handle."
      testID="signup-username-screen"
    >
      <TextField
        autoFocus
        autoCapitalize="none"
        autoComplete="username"
        autoCorrect={false}
        enterKeyHint="next"
        label="Username"
        prefix="35mm/"
        maxLength={USERNAME_MAX_LENGTH}
        onChangeText={(value) =>
          setIdentityDraft(displayName, value.toLowerCase())
        }
        onSubmitEditing={continueToEmail}
        placeholder="username"
        returnKeyType="next"
        textContentType="username"
        value={username}
        {...(usernameError ? { errorMessage: usernameError } : {})}
        {...(usernameMessage ? { message: usernameMessage } : {})}
        {...(availability.status === "checking"
          ? {
              trailing: (
                <Badge accessibilityLiveRegion="polite" label="Checking" />
              ),
            }
          : availability.status === "available"
            ? {
                trailing: (
                  <Badge
                    accessibilityLiveRegion="polite"
                    label="Available"
                    tone="success"
                  />
                ),
              }
            : availability.status === "unavailable"
              ? {
                  trailing: (
                    <Badge
                      accessibilityLiveRegion="polite"
                      label="Unavailable"
                      tone="destructive"
                    />
                  ),
                }
              : {})}
      />

      {availability.status === "error" ? (
        <Pressable
          accessibilityHint="Checks username availability again"
          accessibilityRole="button"
          onPress={availability.retry}
          style={styles.retryTarget}
          testID="signup-username-retry"
        >
          <AppText color="socialAccent" role="rowLabelCompact">
            Try again
          </AppText>
        </Pressable>
      ) : null}

      <Button
        accessibilityHint="Save your username and continue to email"
        disabled={!canContinue}
        fullWidth
        icon="chevron-right"
        iconPosition="trailing"
        label="Continue"
        loading={isContinuing}
        onPress={continueToEmail}
        size="large"
        testID="signup-username-continue"
      />
    </SignupStepScaffold>
  );
}

const styles = StyleSheet.create({
  retryTarget: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
});
