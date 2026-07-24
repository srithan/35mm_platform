import {
  AppText,
  Button,
  InlineNotice,
  LoadingState,
  Screen,
  TextField,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { signupFlowErrorMessage } from "@/features/auth/signup/clerk";
import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { SignupStepScaffold } from "@/features/auth/signup/SignupStepScaffold";
import {
  EMAIL_ADDRESS_MAX_LENGTH,
  validateSignupEmail,
} from "@/features/auth/signup/validation";

export const EMAIL_CODE_LENGTH = 6;
export const EMAIL_RESEND_COOLDOWN_MS = 30_000;

export function emailResendSecondsRemaining(
  sentAt: number | null,
  now: number,
): number {
  if (sentAt === null) return 0;
  return Math.max(
    0,
    Math.ceil((sentAt + EMAIL_RESEND_COOLDOWN_MS - now) / 1_000),
  );
}

export interface SignupVerifyScreenProps {
  readonly completionError: string | null;
  readonly completionPending: boolean;
  readonly isAuthReady: boolean;
  readonly isCompleting: boolean;
  readonly onBack: () => void;
  readonly onChangeEmail: (email: string) => Promise<void>;
  readonly onResend: () => Promise<void>;
  readonly onRetryCompletion: () => void;
  readonly onVerify: (code: string) => Promise<void>;
  readonly now?: () => number;
}

type VerificationAction = "verify" | "resend" | "change-email" | null;

export function SignupVerifyScreen({
  completionError,
  completionPending,
  isAuthReady,
  isCompleting,
  onBack,
  onChangeEmail,
  onResend,
  onRetryCompletion,
  onVerify,
  now = Date.now,
}: SignupVerifyScreenProps) {
  const email = useSignupDraftStore((state) => state.email);
  const sentAt = useSignupDraftStore(
    (state) => state.emailVerificationSentAt,
  );
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const [code, setCode] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [activeAction, setActiveAction] =
    useState<VerificationAction>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clock, setClock] = useState(() => now());
  const actionLockRef = useRef(false);
  const mountedRef = useRef(true);
  const emailValidation = useMemo(
    () => validateSignupEmail(emailInput),
    [emailInput],
  );
  const resendSeconds = emailResendSecondsRemaining(sentAt, clock);
  const isBusy = activeAction !== null || isCompleting;
  const codeIsComplete = code.length === EMAIL_CODE_LENGTH;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasHydrated) return;
    void useSignupDraftStore.persist.rehydrate();
  }, [hasHydrated]);

  useEffect(() => {
    if (emailResendSecondsRemaining(sentAt, now()) === 0) return;
    const interval = setInterval(() => {
      const nextClock = now();
      setClock(nextClock);
      if (emailResendSecondsRemaining(sentAt, nextClock) === 0) {
        clearInterval(interval);
      }
    }, 1_000);
    return () => clearInterval(interval);
  }, [now, sentAt]);

  if (!hasHydrated) {
    return (
      <Screen testID="signup-verify-loading">
        <StatusBar style="dark" />
        <LoadingState label="Restoring verification" />
      </Screen>
    );
  }

  const runAction = async (
    action: Exclude<VerificationAction, null>,
    operation: () => Promise<void>,
  ) => {
    if (actionLockRef.current || isCompleting) return;
    actionLockRef.current = true;
    setActiveAction(action);
    setFormError(null);
    setNotice(null);
    try {
      await operation();
    } catch (error) {
      if (mountedRef.current) {
        setFormError(signupFlowErrorMessage(error));
      }
    } finally {
      actionLockRef.current = false;
      if (mountedRef.current) setActiveAction(null);
    }
  };

  const verify = () => {
    if (!isAuthReady || !codeIsComplete) {
      setFormError("Enter the six-digit code from your email.");
      return;
    }
    void runAction("verify", () => onVerify(code));
  };

  const resend = () => {
    if (!isAuthReady || resendSeconds > 0) return;
    void runAction("resend", async () => {
      await onResend();
      if (mountedRef.current) {
        setCode("");
        setClock(now());
        setNotice(`A new code was sent to ${email}.`);
      }
    });
  };

  const changeEmail = () => {
    if (!isAuthReady || !emailValidation.value) {
      setFormError(emailValidation.error ?? "Enter a valid email address.");
      return;
    }
    void runAction("change-email", async () => {
      await onChangeEmail(emailValidation.value!);
      if (mountedRef.current) {
        setCode("");
        setClock(now());
        setIsChangingEmail(false);
        setNotice(`A verification code was sent to ${emailValidation.value}.`);
      }
    });
  };

  if (completionPending) {
    return (
      <SignupStepScaffold
        headline={"Finishing your\naccount"}
        onBack={onBack}
        showBack={false}
        step={5}
        stepName="Email verification"
        subtitle="Your email is verified. We’re securely completing your 35mm profile."
        testID="signup-verify-screen"
      >
        {completionError ? (
          <>
            <InlineNotice
              accessibilityLiveRegion="assertive"
              message={completionError}
              title="Account setup paused"
              tone="error"
              testID="signup-completion-error"
            />
            <Button
              accessibilityHint="Retry the authenticated profile completion steps"
              disabled={isCompleting}
              fullWidth
              label="Finish account setup"
              loading={isCompleting}
              onPress={onRetryCompletion}
              size="large"
              testID="signup-completion-retry"
            />
          </>
        ) : (
          <LoadingState
            label="Finishing account setup"
            testID="signup-completion-loading"
          />
        )}
      </SignupStepScaffold>
    );
  }

  return (
    <SignupStepScaffold
      headline={"Check your\ninbox"}
      onBack={onBack}
      step={5}
      stepName="Email verification"
      subtitle={`Enter the six-digit code sent to ${email}.`}
      testID="signup-verify-screen"
    >
      <TextField
        autoComplete="one-time-code"
        autoFocus
        editable={!isBusy}
        enterKeyHint="done"
        inputMode="numeric"
        keyboardType="number-pad"
        label="Verification code"
        maxLength={EMAIL_CODE_LENGTH}
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH));
          setFormError(null);
        }}
        onSubmitEditing={verify}
        placeholder="000000"
        returnKeyType="done"
        selectTextOnFocus
        style={styles.codeInput}
        textContentType="oneTimeCode"
        value={code}
        {...(formError ? { errorMessage: formError } : {})}
        {...(formError
          ? {}
          : { message: "Paste or type all six digits." })}
      />

      {notice ? (
        <InlineNotice
          accessibilityLiveRegion="polite"
          message={notice}
          tone="success"
          testID="signup-verify-notice"
        />
      ) : null}

      <Button
        accessibilityHint="Verify your email and complete protected account setup"
        disabled={!isAuthReady || !codeIsComplete || isBusy}
        fullWidth
        label="Verify email"
        loading={activeAction === "verify"}
        onPress={verify}
        size="large"
        testID="signup-verify-submit"
      />

      <View style={styles.secondaryActions}>
        <Button
          accessibilityHint={
            resendSeconds > 0
              ? `Available in ${resendSeconds} seconds`
              : "Send another email verification code"
          }
          disabled={!isAuthReady || resendSeconds > 0 || isBusy}
          label={
            resendSeconds > 0
              ? `Resend code in ${resendSeconds}s`
              : "Resend code"
          }
          loading={activeAction === "resend"}
          onPress={resend}
          testID="signup-verify-resend"
          variant="secondary"
        />
        <Button
          accessibilityHint="Change the email address for this signup"
          disabled={!isAuthReady || isBusy}
          label={isChangingEmail ? "Cancel email change" : "Change email"}
          onPress={() => {
            setFormError(null);
            setIsChangingEmail((value) => {
              if (!value) setEmailInput(email);
              return !value;
            });
          }}
          testID="signup-verify-change-email"
          variant="ghost"
        />
      </View>

      {isChangingEmail ? (
        <View style={styles.changeEmail}>
          <AppText role="rowLabelCompact">Use a different email</AppText>
          <TextField
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isBusy}
            inputMode="email"
            keyboardType="email-address"
            label="New email"
            maxLength={EMAIL_ADDRESS_MAX_LENGTH}
            onChangeText={(value) => {
              setEmailInput(value.toLowerCase());
              setFormError(null);
            }}
            onSubmitEditing={changeEmail}
            returnKeyType="send"
            spellCheck={false}
            textContentType="emailAddress"
            value={emailInput}
            {...(emailInput.length > 0 && emailValidation.error
              ? { errorMessage: emailValidation.error }
              : {})}
          />
          <Button
            accessibilityHint="Update the signup email and send a new verification code"
            disabled={!emailValidation.value || isBusy}
            fullWidth
            label="Send code to new email"
            loading={activeAction === "change-email"}
            onPress={changeEmail}
            testID="signup-verify-save-email"
            variant="secondary"
          />
        </View>
      ) : null}
    </SignupStepScaffold>
  );
}

const styles = StyleSheet.create({
  changeEmail: {
    gap: 14,
  },
  codeInput: {
    fontVariant: ["tabular-nums"],
    letterSpacing: 8,
    textAlign: "center",
  },
  secondaryActions: {
    alignItems: "center",
    gap: 8,
  },
});
