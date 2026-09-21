import { AppIcon, useMobileUI } from "@35mm/mobile-ui";
import {
  AppText,
  Button,
  InlineNotice,
  PasswordField,
} from "../components/controls";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { PasswordResetScaffold } from "@/features/auth/password/PasswordResetScaffold";
import {
  PASSWORD_MIN_LENGTH,
  validateSignupPassword,
} from "@/features/auth/signup/validation";
import { passwordResetFlowErrorMessage } from "./clerk";

export interface NewPasswordScreenProps {
  readonly isReady: boolean;
  readonly onBack: () => void;
  readonly onSubmit: (password: string) => Promise<void>;
}

export function NewPasswordScreen({
  isReady,
  onBack,
  onSubmit,
}: NewPasswordScreenProps) {
  const { theme } = useMobileUI();
  const confirmationInputRef = useRef<TextInput>(null);
  const actionLockRef = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validation = useMemo(
    () => validateSignupPassword(password, confirmation),
    [confirmation, password],
  );
  const hasValidLength = Array.from(password).length >= PASSWORD_MIN_LENGTH;
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const canSubmit = validation.value !== null && isReady && !isSubmitting;

  const submit = () => {
    setShowValidation(true);
    if (!validation.value || !canSubmit || actionLockRef.current) return;
    actionLockRef.current = true;
    setIsSubmitting(true);
    setError(null);
    void onSubmit(validation.value.password)
      .catch((caught) => setError(passwordResetFlowErrorMessage(caught)))
      .finally(() => {
        actionLockRef.current = false;
        setIsSubmitting(false);
      });
  };

  const passwordError =
    (showValidation || password.length > 0) && validation.passwordError
      ? validation.passwordError
      : undefined;
  const confirmationError =
    (showValidation || confirmation.length > 0) && validation.confirmationError
      ? validation.confirmationError
      : undefined;

  return (
    <PasswordResetScaffold
      headline={"Create a\nnew password."}
      onBack={onBack}
      subtitle="Choose a fresh password you don’t use anywhere else."
      testID="new-password-screen"
    >
      <View style={styles.content}>
        {error ? (
          <InlineNotice
            accessibilityLiveRegion="assertive"
            message={error}
            tone="error"
            testID="new-password-error"
          />
        ) : null}
        <PasswordField
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          blurOnSubmit={false}
          editable={!isSubmitting}
          enterKeyHint="next"
          importantForAutofill="yes"
          label="New password"
          onChangeText={(value) => {
            setPassword(value);
            setError(null);
          }}
          onSubmitEditing={() => confirmationInputRef.current?.focus()}
          onVisibilityChange={setPasswordVisible}
          passwordRules={`minlength: ${PASSWORD_MIN_LENGTH};`}
          placeholder="Create a password"
          returnKeyType="next"
          spellCheck={false}
          testID="new-password-input"
          textContentType="newPassword"
          value={password}
          visible={passwordVisible}
          {...(passwordError ? { errorMessage: passwordError } : {})}
        />
        <PasswordField
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={!isSubmitting}
          enterKeyHint="done"
          importantForAutofill="yes"
          inputRef={confirmationInputRef}
          label="Confirm new password"
          onChangeText={(value) => {
            setConfirmation(value);
            setError(null);
          }}
          onSubmitEditing={submit}
          onVisibilityChange={setConfirmationVisible}
          passwordRules={`minlength: ${PASSWORD_MIN_LENGTH};`}
          placeholder="Enter it again"
          returnKeyType="done"
          spellCheck={false}
          testID="new-password-confirmation-input"
          textContentType="newPassword"
          value={confirmation}
          visible={confirmationVisible}
          {...(confirmationError ? { errorMessage: confirmationError } : {})}
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
            pendingColor={theme.colors.textSecondary}
            successColor={theme.colors.success}
            text={`${PASSWORD_MIN_LENGTH} or more characters`}
          />
          <RequirementRow
            met={passwordsMatch}
            pendingColor={theme.colors.textSecondary}
            successColor={theme.colors.success}
            text="Passwords match"
          />
        </View>
        <Button
          disabled={!canSubmit}
          fullWidth
          label="Update password"
          loading={isSubmitting}
          onPress={submit}
          size="large"
          testID="new-password-submit"
        />
      </View>
    </PasswordResetScaffold>
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
  content: { gap: 18 },
  requirementRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  requirements: {
    gap: 8,
  },
});
