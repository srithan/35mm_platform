import {
  AppText,
  Button,
  IconButton,
  InlineNotice,
  MobileUIProvider,
  PasswordField,
  Screen,
  TextField,
  useMobileUI,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { loginFlowErrorMessage, type LoginStep } from "./clerk";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_MS = 30_000;

export interface LoginScreenProps {
  readonly isReady: boolean;
  readonly onBack: () => void;
  readonly onCreateAccount: () => void;
  readonly onResend: () => Promise<void>;
  readonly onSignIn: (input: {
    readonly identifier: string;
    readonly password: string;
  }) => Promise<LoginStep>;
  readonly onVerify: (code: string) => Promise<void>;
  readonly now?: () => number;
}

export function LoginScreen(props: LoginScreenProps) {
  const { reduceMotion } = useMobileUI();
  return (
    <MobileUIProvider
      preference="light"
      reduceMotion={reduceMotion}
      systemColorScheme="light"
    >
      <LoginContent {...props} />
    </MobileUIProvider>
  );
}

function LoginContent({
  isReady,
  onBack,
  onCreateAccount,
  onResend,
  onSignIn,
  onVerify,
  now = Date.now,
}: LoginScreenProps) {
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
    <Screen
      safeAreaEdges={["top", "left", "right", "bottom"]}
      style={styles.screen}
      testID="login-screen"
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <IconButton
              accessibilityHint="Return to Welcome"
              icon="back"
              label="Back"
              onPress={onBack}
              testID="login-back"
            />
            <AppText role="rowLabelCompact">Log in</AppText>
            <View accessibilityElementsHidden style={styles.topBarSpacer} />
          </View>

          <ImageBackground
            accessible={false}
            imageStyle={styles.heroImage}
            importantForAccessibility="no-hide-descendants"
            resizeMode="cover"
            source={require("../../../../assets/images/welcome-hero.png")}
            style={styles.hero}
            testID="login-hero"
          />

          <View style={styles.content}>
            <View style={styles.heading}>
              <AppText accessibilityRole="header" align="center" role="display">
                {needsVerification ? "Check your\ninbox" : "Welcome\nback."}
              </AppText>
              <AppText align="center" color="textSecondary" role="bodyLarge">
                {needsVerification
                  ? `Enter the six-digit code sent to ${verificationTarget}.`
                  : "Sign in to keep tracking, sharing, and discovering films."}
              </AppText>
            </View>

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
                  maxLength={254}
                  onChangeText={(value) => {
                    setIdentifier(value);
                    setError(null);
                  }}
                  onSubmitEditing={signIn}
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
                <View style={styles.createRow}>
                  <AppText color="textSecondary" role="metadata">
                    New to 35mm?
                  </AppText>
                  <Pressable
                    accessibilityHint="Create a 35mm account"
                    accessibilityRole="link"
                    disabled={isBusy}
                    hitSlop={8}
                    onPress={onCreateAccount}
                    style={styles.inlineLink}
                    testID="login-create-account"
                  >
                    <AppText role="authorName">Create account</AppText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
  },
  content: {
    gap: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  createRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  flex: { flex: 1 },
  heading: { alignItems: "center", gap: 12 },
  hero: { height: 190, width: "100%" },
  heroImage: { backgroundColor: "#C2473A", opacity: 0.92 },
  inlineLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  screen: { backgroundColor: "#FFFAF2" },
  scrollContent: { flexGrow: 1 },
  secondaryActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 8,
  },
  topBarSpacer: { height: 44, width: 44 },
});
