import {
  AppIcon,
  AppText,
  Button,
  LoadingState,
  PasswordField,
  Screen,
  useMobileUI,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

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
  const passwordConfirmation = useSignupDraftStore(
    (state) => state.passwordConfirmation,
  );
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const setPasswordDraft = useSignupDraftStore(
    (state) => state.setPasswordDraft,
  );
  const confirmationInputRef = useRef<TextInput>(null);
  const continueLockRef = useRef(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const validation = useMemo(
    () => validateSignupPassword(password, passwordConfirmation),
    [password, passwordConfirmation],
  );
  const canContinue = validation.value !== null && !isContinuing;
  const hasValidLength =
    Array.from(password).length >= PASSWORD_MIN_LENGTH;
  const passwordsMatch =
    passwordConfirmation.length > 0 && password === passwordConfirmation;

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
    setPasswordDraft(
      validation.value.password,
      validation.value.confirmation,
    );
    onContinue();
  };

  const passwordError =
    (showValidation || password.length > 0) && validation.passwordError
      ? validation.passwordError
      : undefined;
  const confirmationError =
    (showValidation || passwordConfirmation.length > 0) &&
    validation.confirmationError
      ? validation.confirmationError
      : undefined;

  return (
    <SignupStepScaffold
      headline={"Lock in\nyour login."}
      onBack={onBack}
      step={3}
      stepName="Password"
      subtitle="Choose a password you don’t use anywhere else."
      testID="signup-password-screen"
    >
      <View style={styles.fields}>
        <PasswordField
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          blurOnSubmit={false}
          enterKeyHint="next"
          importantForAutofill="yes"
          label="Password"
          leadingIcon="lock"
          onChangeText={(value) =>
            setPasswordDraft(value, passwordConfirmation)
          }
          onSubmitEditing={() => confirmationInputRef.current?.focus()}
          onVisibilityChange={setIsPasswordVisible}
          passwordRules={`minlength: ${PASSWORD_MIN_LENGTH};`}
          placeholder="Create a password"
          returnKeyType="next"
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

        <PasswordField
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          enterKeyHint="done"
          importantForAutofill="yes"
          inputRef={confirmationInputRef}
          label="Confirm password"
          leadingIcon="lock"
          onChangeText={(value) => setPasswordDraft(password, value)}
          onSubmitEditing={continueToDob}
          onVisibilityChange={setIsConfirmationVisible}
          passwordRules={`minlength: ${PASSWORD_MIN_LENGTH};`}
          placeholder="Enter it again"
          returnKeyType="done"
          spellCheck={false}
          testID="signup-password-confirmation-input"
          textContentType="newPassword"
          value={passwordConfirmation}
          visible={isConfirmationVisible}
          {...(confirmationError
            ? { errorMessage: confirmationError }
            : {})}
        />

        <View
          accessibilityLabel={`Password requirements. ${
            hasValidLength ? "Met" : "Not met"
          }: ${PASSWORD_MIN_LENGTH} or more characters. ${
            passwordsMatch ? "Met" : "Not met"
          }: passwords match.`}
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
          <RequirementRow
            met={passwordsMatch}
            text="Passwords match"
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
      <AppText
        color={met ? "success" : "textSecondary"}
        role="metadata"
      >
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
