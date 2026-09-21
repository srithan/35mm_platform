import { Button, InlineNotice, TextField } from "../components/controls";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PasswordResetScaffold } from "@/features/auth/password/PasswordResetScaffold";
import { passwordResetFlowErrorMessage } from "./clerk";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_MS = 30_000;

export interface VerifyPasswordResetScreenProps {
  readonly isReady: boolean;
  readonly target: string;
  readonly onBack: () => void;
  readonly onResend: () => Promise<void>;
  readonly onVerify: (code: string) => Promise<void>;
  readonly now?: () => number;
}

export function VerifyPasswordResetScreen({
  isReady,
  target,
  onBack,
  onResend,
  onVerify,
  now = Date.now,
}: VerifyPasswordResetScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"verify" | "resend" | null>(
    null,
  );
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => now() + RESEND_COOLDOWN_MS,
  );
  const [clock, setClock] = useState(() => now());
  const actionLockRef = useRef(false);
  const resendSeconds = Math.max(
    0,
    Math.ceil((resendAvailableAt - clock) / 1_000),
  );
  const isBusy = busyAction !== null;

  useEffect(() => {
    if (resendAvailableAt <= now()) return;
    const interval = setInterval(() => {
      const next = now();
      setClock(next);
      if (next >= resendAvailableAt) clearInterval(interval);
    }, 1_000);
    return () => clearInterval(interval);
  }, [now, resendAvailableAt]);

  const run = async (
    action: NonNullable<typeof busyAction>,
    operation: () => Promise<void>,
  ) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyAction(action);
    setError(null);
    setNotice(null);
    try {
      await operation();
    } catch (caught) {
      setError(passwordResetFlowErrorMessage(caught));
    } finally {
      actionLockRef.current = false;
      setBusyAction(null);
    }
  };

  const verify = () => {
    if (code.length !== CODE_LENGTH) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    void run("verify", () => onVerify(code));
  };

  const resend = () => {
    if (resendSeconds > 0) return;
    void run("resend", async () => {
      await onResend();
      const sentAt = now();
      setCode("");
      setClock(sentAt);
      setResendAvailableAt(sentAt + RESEND_COOLDOWN_MS);
      setNotice(`A new code was sent to ${target}.`);
    });
  };

  return (
    <PasswordResetScaffold
      headline={"Check your\ninbox."}
      onBack={onBack}
      subtitle={`Enter the six-digit reset code sent to ${target}.`}
      testID="verify-password-reset-screen"
    >
      <View style={styles.content}>
        {error ? (
          <InlineNotice
            accessibilityLiveRegion="assertive"
            message={error}
            tone="error"
            testID="verify-password-reset-error"
          />
        ) : null}
        {notice ? (
          <InlineNotice
            accessibilityLiveRegion="polite"
            message={notice}
            tone="success"
            testID="verify-password-reset-notice"
          />
        ) : null}
        <TextField
          autoComplete="one-time-code"
          autoFocus
          editable={!isBusy}
          inputMode="numeric"
          keyboardType="number-pad"
          label="Reset code"
          maxLength={CODE_LENGTH}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, "").slice(0, CODE_LENGTH));
            setError(null);
          }}
          onSubmitEditing={verify}
          placeholder="000000"
          returnKeyType="done"
          style={styles.codeInput}
          textContentType="oneTimeCode"
          testID="verify-password-reset-code"
          value={code}
        />
        <Button
          disabled={!isReady || code.length !== CODE_LENGTH || isBusy}
          fullWidth
          label="Verify code"
          loading={busyAction === "verify"}
          onPress={verify}
          size="large"
          testID="verify-password-reset-submit"
        />
        <Button
          disabled={!isReady || resendSeconds > 0 || isBusy}
          label={
            resendSeconds > 0
              ? `Resend code in ${resendSeconds}s`
              : "Resend code"
          }
          loading={busyAction === "resend"}
          onPress={resend}
          testID="verify-password-reset-resend"
          variant="secondary"
        />
      </View>
    </PasswordResetScaffold>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
  },
  content: { gap: 18 },
});
