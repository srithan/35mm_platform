import { AppIcon, LoadingState, useMobileUI } from "@35mm/mobile-ui";
import { AppText, Button, PasswordField, Screen } from "../components/controls";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { SignupStepScaffold } from "@/features/auth/signup/SignupStepScaffold";
import {
  PASSWORD_MIN_LENGTH,
  validateSignupPassword,
} from "@/features/auth/signup/validation";

export interface SignupPasswordScreenProps {
  readonly onBack: () => void;
  readonly onContinue: () => void;
}

export function SignupPasswordScreen({
  onBack,
  onContinue,
}: SignupPasswordScreenProps) {
  const { theme } = useMobileUI();
  const password = useSignupDraftStore((state) => state.password);
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const setPasswordDraft = useSignupDraftStore(
    (state) => state.setPasswordDraft,
  );
  const continueLockRef = useRef(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const validation = useMemo(
    () => validateSignupPassword(password),
    [password],
  );
  const canContinue = validation.value !== null && !isContinuing;
  const hasValidLength = Array.from(password).length >= PASSWORD_MIN_LENGTH;

  useEffect(() => {
    if (hasHydrated) return;
    void useSignupDraftStore.persist.rehydrate();
  }, [hasHydrated]);

  if (!hasHydrated) {
    return (
      <Screen testID="signup-password-loading">
        <StatusBar style="dark" />
        <LoadingState label="Restoring signup details" />
      </Screen>
    );
  }

  const continueToDob = () => {
    setShowValidation(true);
    if (!canContinue || !validation.value || continueLockRef.current) return;
    continueLockRef.current = true;
    setIsContinuing(true);
    setPasswordDraft(validation.value.password, validation.value.password);
    onContinue();
  };

  const passwordError =
    (showValidation || password.length > 0) && validation.passwordError
      ? validation.passwordError
      : undefined;

  return (
    <SignupStepScaffold
      headline="Create a password"
      onBack={onBack}
      step={4}
      stepName="Password"
      subtitle={`Use at least ${PASSWORD_MIN_LENGTH} characters.`}
      testID="signup-password-screen"
    >
      <View style={styles.fields}>
        <PasswordField
          autoFocus
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          enterKeyHint="done"
          importantForAutofill="yes"
          label="Password"
          onChangeText={(value) => setPasswordDraft(value, value)}
          onSubmitEditing={continueToDob}
          onVisibilityChange={setIsPasswordVisible}
          passwordRules={`minlength: ${PASSWORD_MIN_LENGTH};`}
          placeholder="Create a password"
          returnKeyType="done"
          spellCheck={false}
          testID="signup-password-input"
          textContentType="newPassword"
          value={password}
          visible={isPasswordVisible}
          {...(passwordError ? { errorMessage: passwordError } : {})}
          {...(passwordError
            ? {}
            : {
                message:
                  "Easy-to-guess and compromised passwords are rejected when your account is created.",
              })}
        />

        <View
          accessibilityLabel={`Password requirements. ${
            hasValidLength ? "Met" : "Not met"
          }: ${PASSWORD_MIN_LENGTH} or more characters.`}
          accessibilityLiveRegion="polite"
          accessible
          style={styles.requirements}
        >
          <RequirementRow
            met={hasValidLength}
            text={`${PASSWORD_MIN_LENGTH} or more characters`}
            pendingColor={theme.colors.textSecondary}
            successColor={theme.colors.success}
          />
        </View>
      </View>

      <Button
        accessibilityHint="Keep this password in memory and continue to date of birth"
        disabled={!canContinue}
        fullWidth
        icon="chevron-right"
        iconPosition="trailing"
        label="Continue"
        loading={isContinuing}
        onPress={continueToDob}
        size="large"
        testID="signup-password-continue"
      />
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Edit email"
        onPress={onBack}
        style={{
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText color="socialAccent" role="metadata">
          Edit email
        </AppText>
      </Pressable>
    </SignupStepScaffold>
  );
}

function RequirementRow({
  met,
  text,
  pendingColor,
  successColor,
}: {
  readonly met: boolean;
  readonly text: string;
  readonly pendingColor: string;
  readonly successColor: string;
}) {
  return (
    <View accessibilityElementsHidden style={styles.requirementRow}>
      <AppIcon
        color={met ? successColor : pendingColor}
        name={met ? "check" : "warning"}
        size="extraSmall"
      />
      <AppText color={met ? "success" : "textSecondary"} role="metadata">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
  },
  requirementRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  requirements: {
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
});
