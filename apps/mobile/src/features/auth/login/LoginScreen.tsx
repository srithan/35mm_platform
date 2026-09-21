import {
  AppText,
  Button,
  InlineNotice,
  PasswordField,
  TextField,
} from "../components/controls";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, TextInput } from "react-native";
import { AuthScaffold } from "../components/AuthScaffold";

import { loginFlowErrorMessage, type LoginStep } from "./clerk";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_MS = 30_000;

export interface LoginScreenProps {
  readonly isReady: boolean;
  readonly onBack: () => void;
  readonly onCreateAccount: () => void;
  readonly onForgotPassword: () => void;
  readonly onResend: () => Promise<void>;
  readonly onSignIn: (input: {
    readonly identifier: string;
    readonly password: string;
  }) => Promise<LoginStep>;
  readonly onVerify: (code: string) => Promise<void>;
  readonly now?: () => number;
}

export function LoginScreen({
  isReady,
  onBack,
  onCreateAccount,
  onForgotPassword,
  onResend,
  onSignIn,
  onVerify,
  now = Date.now,
}: LoginScreenProps) {
  const passwordRef = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [verificationTarget, setVerificationTarget] = useState<string | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "sign-in" | "verify" | "resend" | null
  >(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    null,
  );
  const [clock, setClock] = useState(() => now());
  const actionLockRef = useRef(false);
  const mountedRef = useRef(true);
  const needsVerification = verificationTarget !== null;
  const resendSeconds = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - clock) / 1_000))
    : 0;
  const isBusy = busyAction !== null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!resendAvailableAt || resendAvailableAt <= now()) return;
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
      if (mountedRef.current) setError(loginFlowErrorMessage(caught));
    } finally {
      actionLockRef.current = false;
      if (mountedRef.current) setBusyAction(null);
    }
  };

  const signIn = () => {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password) {
      setError("Enter your email or username and password.");
      return;
    }
    void run("sign-in", async () => {
      const step = await onSignIn({
        identifier: normalizedIdentifier,
        password,
      });
      if (step.status === "needs_verification" && mountedRef.current) {
        setPassword("");
        setCode("");
        setVerificationTarget(step.safeIdentifier ?? "your email address");
        const sentAt = now();
        setClock(sentAt);
        setResendAvailableAt(sentAt + RESEND_COOLDOWN_MS);
      }
    });
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
      if (mountedRef.current) {
        const sentAt = now();
        setCode("");
        setClock(sentAt);
        setResendAvailableAt(sentAt + RESEND_COOLDOWN_MS);
        setNotice(`A new code was sent to ${verificationTarget}.`);
      }
    });
  };

  return (
    <AuthScaffold onBack={onBack} title="Log in" testID="login-screen">
      <View style={styles.content}>
        {needsVerification ? (
          <AppText color="textSecondary">
            Enter the six-digit code sent to {verificationTarget}.
          </AppText>
        ) : null}
        {error ? (
          <InlineNotice
            accessibilityLiveRegion="assertive"
            message={error}
            tone="error"
            testID="login-error"
          />
        ) : null}
        {notice ? (
          <InlineNotice
            accessibilityLiveRegion="polite"
            message={notice}
            tone="success"
            testID="login-notice"
          />
        ) : null}

        {needsVerification ? (
          <>
            <TextField
              autoComplete="one-time-code"
              autoFocus
              editable={!isBusy}
              inputMode="numeric"
              keyboardType="number-pad"
              label="Verification code"
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
              testID="login-code"
              value={code}
            />
            <Button
              disabled={!isReady || code.length !== CODE_LENGTH || isBusy}
              fullWidth
              label="Verify and log in"
              loading={busyAction === "verify"}
              onPress={verify}
              size="large"
              testID="login-verify"
            />
            <View style={styles.secondaryActions}>
              <Button
                disabled={!isReady || resendSeconds > 0 || isBusy}
                label={
                  resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : "Resend code"
                }
                loading={busyAction === "resend"}
                onPress={resend}
                testID="login-resend"
                variant="secondary"
              />
              <Button
                disabled={isBusy}
                label="Use another account"
                onPress={() => {
                  setVerificationTarget(null);
                  setCode("");
                  setError(null);
                  setNotice(null);
                }}
                testID="login-use-another"
                variant="ghost"
              />
            </View>
          </>
        ) : (
          <>
            <TextField
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              editable={!isBusy}
              label="Email or username"
              showLabel
              autoFocus
              placeholder="Your email or username"
              keyboardType="email-address"
              maxLength={254}
              onChangeText={(value) => {
                setIdentifier(value);
                setError(null);
              }}
              onSubmitEditing={() => passwordRef.current?.focus()}
              returnKeyType="next"
              spellCheck={false}
              textContentType="username"
              testID="login-identifier"
              value={identifier}
            />
            <PasswordField
              autoComplete="current-password"
              editable={!isBusy}
              label="Password"
              showLabel
              inputRef={passwordRef}
              placeholder="Your password"
              onChangeText={(value) => {
                setPassword(value);
                setError(null);
              }}
              onSubmitEditing={signIn}
              returnKeyType="go"
              textContentType="password"
              testID="login-password"
              value={password}
              visible={passwordVisible}
              onVisibilityChange={setPasswordVisible}
            />
            <Button
              disabled={!isReady || !identifier.trim() || !password || isBusy}
              fullWidth
              label="Log in"
              loading={busyAction === "sign-in"}
              onPress={signIn}
              size="large"
              testID="login-submit"
            />
            <View style={styles.forgotRow}>
              <Pressable
                accessibilityHint="Reset your password by email"
                accessibilityRole="link"
                disabled={isBusy}
                hitSlop={8}
                onPress={onForgotPassword}
                style={styles.inlineLink}
                testID="login-forgot-password"
              >
                <AppText role="authorName">Forgot password?</AppText>
              </Pressable>
            </View>
            <View style={styles.createRow}>
              <Pressable
                accessibilityHint="Create a 35mm account"
                accessibilityRole="link"
                disabled={isBusy}
                hitSlop={8}
                onPress={onCreateAccount}
                style={styles.inlineLink}
                testID="login-create-account"
              >
                <AppText color="socialAccent" role="authorName">
                  Create account
                </AppText>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  codeInput: { fontSize: 20, letterSpacing: 8, textAlign: "center" },
  content: { gap: 20 },
  createRow: { alignItems: "center", justifyContent: "center" },
  forgotRow: { alignItems: "center" },
  inlineLink: { alignItems: "center", justifyContent: "center", minHeight: 44 },
  secondaryActions: { alignItems: "center", gap: 8 },
});
