import {
  AppText,
  Badge,
  Button,
  LoadingState,
  Screen,
  TextField,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import type { UsernameAvailabilityClient } from "@/features/auth/signup/api";
import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { SignupStepScaffold } from "@/features/auth/signup/SignupStepScaffold";
import { useUsernameAvailability } from "@/features/auth/signup/useUsernameAvailability";
import {
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  validateSignupIdentity,
} from "@/features/auth/signup/validation";

export interface SignupNameScreenProps {
  readonly client: UsernameAvailabilityClient;
  readonly onBack: () => void;
  readonly onContinue: () => void;
}

export function SignupNameScreen({
  client,
  onBack,
  onContinue,
}: SignupNameScreenProps) {
  const displayName = useSignupDraftStore((state) => state.displayName);
  const username = useSignupDraftStore((state) => state.username);
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const setIdentityDraft = useSignupDraftStore(
    (state) => state.setIdentityDraft,
  );
  const usernameInputRef = useRef<TextInput>(null);
  const continueLockRef = useRef(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const validation = useMemo(
    () => validateSignupIdentity(displayName, username),
    [displayName, username],
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
      <Screen testID="signup-name-loading">
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
    setIdentityDraft(
      validation.value.displayName,
      validation.value.username,
    );
    onContinue();
  };

  const usernameError =
    showValidation && validation.usernameError
      ? validation.usernameError
      : availability.status === "invalid" ||
          availability.status === "unavailable" ||
          availability.status === "error"
        ? availability.message
        : undefined;
  const usernameMessage =
    username.length === 0
      ? "Letters, numbers, dots and underscores only"
      : availability.status === "checking"
        ? "Checking availability…"
        : availability.status === "available"
          ? `35mm/${validation.value?.username ?? username} is available`
          : undefined;

  return (
    <SignupStepScaffold
      headline={"Claim your\n35mm."}
      onBack={onBack}
      step={1}
      stepName="Name"
      subtitle="Start with your name and the username people will know you by."
      testID="signup-name-screen"
    >
      <View style={styles.fields}>
        <TextField
          autoCapitalize="words"
          autoComplete="name"
          blurOnSubmit={false}
          enterKeyHint="next"
          label="Full name"
          leadingIcon="user"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          onChangeText={(value) => setIdentityDraft(value, username)}
          onSubmitEditing={() => usernameInputRef.current?.focus()}
          placeholder="Your name"
          returnKeyType="next"
          textContentType="name"
          value={displayName}
          {...((showValidation || displayName.length > 0) &&
          validation.displayNameError
            ? { errorMessage: validation.displayNameError }
            : {})}
        />
        <TextField
          inputRef={usernameInputRef}
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect={false}
          enterKeyHint="next"
          label="Username"
          leadingIcon="user"
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
                  <Badge
                    accessibilityLiveRegion="polite"
                    label="Checking"
                  />
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
      </View>

      <Button
        accessibilityHint="Save your name and continue to email"
        disabled={!canContinue}
        fullWidth
        icon="chevron-right"
        iconPosition="trailing"
        label="Continue"
        loading={isContinuing}
        onPress={continueToEmail}
        size="large"
        testID="signup-name-continue"
      />
    </SignupStepScaffold>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
  },
  retryTarget: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
});
