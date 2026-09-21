import { Button, InlineNotice, TextField } from "../components/controls";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PasswordResetScaffold } from "@/features/auth/password/PasswordResetScaffold";
import {
  EMAIL_ADDRESS_MAX_LENGTH,
  validateSignupEmail,
} from "@/features/auth/signup/validation";
import { passwordResetFlowErrorMessage } from "./clerk";

export interface ForgotPasswordScreenProps {
  readonly isReady: boolean;
  readonly onBack: () => void;
  readonly onSubmit: (email: string) => Promise<void>;
}

export function ForgotPasswordScreen({
  isReady,
  onBack,
  onSubmit,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const actionLockRef = useRef(false);
  const validation = validateSignupEmail(email);
  const canSubmit = validation.value !== null && !isSubmitting && isReady;

  const submit = () => {
    const nextValidation = validateSignupEmail(email);
    if (!nextValidation.value) {
      setError(nextValidation.error);
      return;
    }
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setIsSubmitting(true);
    setError(null);
    void onSubmit(nextValidation.value)
      .catch((caught) => setError(passwordResetFlowErrorMessage(caught)))
      .finally(() => {
        actionLockRef.current = false;
        setIsSubmitting(false);
      });
  };

  return (
    <PasswordResetScaffold
      headline={"Find your\naccount."}
      onBack={onBack}
      subtitle="Enter the email for your account. If it matches, we’ll send a reset code."
      testID="forgot-password-screen"
    >
      <View style={styles.content}>
        {error ? (
          <InlineNotice
            accessibilityLiveRegion="assertive"
            message={error}
            tone="error"
            testID="forgot-password-error"
          />
        ) : null}
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!isSubmitting}
          inputMode="email"
          keyboardType="email-address"
          label="Email"
          maxLength={EMAIL_ADDRESS_MAX_LENGTH}
          onChangeText={(value) => {
            setEmail(value);
            setError(null);
          }}
          onSubmitEditing={submit}
          placeholder="you@example.com"
          returnKeyType="send"
          spellCheck={false}
          textContentType="emailAddress"
          testID="forgot-password-email"
          value={email}
        />
        <Button
          disabled={!canSubmit}
          fullWidth
          label="Send reset code"
          loading={isSubmitting}
          onPress={submit}
          size="large"
          testID="forgot-password-submit"
        />
      </View>
    </PasswordResetScaffold>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18 },
});
