import { isApiClientError } from "@35mm/api-client";
import { useAuth } from "@clerk/expo";
import { useSignUp } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  changeSignupEmailAddress,
  resendEmailCodeSignUp,
  SignupFlowError,
  verifyEmailCodeSignUp,
} from "@/features/auth/signup/clerk";
import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { persistVerifiedSignupDateOfBirth } from "@/features/auth/signup/postVerification";
import { SignupVerifyScreen } from "@/features/auth/signup/SignupVerifyScreen";
import { useApiClient } from "@/services/api";

function completionErrorMessage(error: unknown): string {
  if (
    isApiClientError(error) &&
    (error.kind === "network" || error.kind === "timeout")
  ) {
    return "Your email is verified, but 35mm couldn’t finish your profile. Check your connection and retry.";
  }
  if (error instanceof SignupFlowError) return error.userMessage;
  return "Your email is verified, but 35mm couldn’t finish your profile. Retry to complete account setup.";
}

export default function SignupVerifyRoute() {
  const router = useRouter();
  const client = useApiClient();
  const {
    isLoaded: isSignUpLoaded,
    setActive,
    signUp,
  } = useSignUp();
  const {
    isLoaded: isAuthLoaded,
    isSignedIn,
    userId: activeUserId,
  } = useAuth();
  const dateOfBirth = useSignupDraftStore((state) => state.dateOfBirth);
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const completionUserId = useSignupDraftStore(
    (state) => state.completionUserId,
  );
  const setEmailDraft = useSignupDraftStore(
    (state) => state.setEmailDraft,
  );
  const markEmailVerificationSent = useSignupDraftStore(
    (state) => state.markEmailVerificationSent,
  );
  const markCompletionPending = useSignupDraftStore(
    (state) => state.markCompletionPending,
  );
  const clearDraft = useSignupDraftStore((state) => state.clearDraft);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(
    null,
  );
  const completionLockRef = useRef(false);
  const autoRecoveryAttemptedRef = useRef(false);
  const mountedRef = useRef(true);
  const requestControllerRef = useRef<AbortController | null>(null);
  const isVerificationReady =
    isSignUpLoaded &&
    isAuthLoaded &&
    Boolean(signUp) &&
    Boolean(setActive);
  const canRecoverCompletion =
    isAuthLoaded &&
    Boolean(
      (isSignedIn &&
        activeUserId &&
        activeUserId === completionUserId) ||
        (isSignUpLoaded && signUp && setActive),
    );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
    };
  }, []);

  const completeAccount = useCallback(
    async (targetUserId: string, sessionId?: string) => {
      if (completionLockRef.current) return;
      completionLockRef.current = true;
      setCompletionError(null);
      setIsCompleting(true);
      try {
        if (sessionId) {
          if (!setActive) {
            throw new SignupFlowError(
              "CLERK_NOT_READY",
              "Account services are still loading. Try again.",
            );
          }
          await setActive({ session: sessionId });
        } else if (!isSignedIn || activeUserId !== targetUserId) {
          if (!signUp || !setActive) {
            throw new SignupFlowError(
              "CLERK_NOT_READY",
              "Account services are still loading. Try again.",
            );
          }
          if (
            signUp.status !== "complete" ||
            signUp.createdUserId !== targetUserId ||
            !signUp.createdSessionId
          ) {
            throw new SignupFlowError(
              "SIGNUP_SESSION_RECOVERY_REQUIRED",
              "Your verified session couldn’t be restored. Return to Welcome and sign in to finish setup.",
            );
          }
          await setActive({ session: signUp.createdSessionId });
        }

        const controller = new AbortController();
        requestControllerRef.current = controller;
        await persistVerifiedSignupDateOfBirth(client, {
          dateOfBirth,
          idempotencyKey: `signup-date-of-birth:${targetUserId}`,
          signal: controller.signal,
        });
        clearDraft();
        router.replace("/");
      } catch (error) {
        if (mountedRef.current) {
          setCompletionError(completionErrorMessage(error));
        }
      } finally {
        requestControllerRef.current = null;
        completionLockRef.current = false;
        if (mountedRef.current) setIsCompleting(false);
      }
    },
    [
      activeUserId,
      clearDraft,
      client,
      dateOfBirth,
      isSignedIn,
      router,
      setActive,
      signUp,
    ],
  );

  useEffect(() => {
    if (
      !hasHydrated ||
      !canRecoverCompletion ||
      !completionUserId ||
      autoRecoveryAttemptedRef.current
    ) {
      return;
    }
    autoRecoveryAttemptedRef.current = true;
    void completeAccount(completionUserId);
  }, [
    completeAccount,
    completionUserId,
    canRecoverCompletion,
    hasHydrated,
  ]);

  return (
    <SignupVerifyScreen
      completionError={completionError}
      completionPending={completionUserId !== null}
      isAuthReady={isVerificationReady}
      isCompleting={isCompleting}
      onBack={() => router.back()}
      onChangeEmail={async (nextEmail) => {
        if (!isSignUpLoaded || !signUp) {
          throw new SignupFlowError(
            "CLERK_NOT_READY",
            "Account services are still loading. Try again.",
          );
        }
        await changeSignupEmailAddress(signUp, nextEmail, () => {
          setEmailDraft(nextEmail);
        });
        markEmailVerificationSent(Date.now());
      }}
      onResend={async () => {
        if (!isSignUpLoaded || !signUp) {
          throw new SignupFlowError(
            "CLERK_NOT_READY",
            "Account services are still loading. Try again.",
          );
        }
        await resendEmailCodeSignUp(signUp);
        markEmailVerificationSent(Date.now());
      }}
      onRetryCompletion={() => {
        if (completionUserId) {
          void completeAccount(completionUserId);
        }
      }}
      onVerify={async (code) => {
        if (!isSignUpLoaded || !signUp) {
          throw new SignupFlowError(
            "CLERK_NOT_READY",
            "Account services are still loading. Try again.",
          );
        }
        const verified = await verifyEmailCodeSignUp(signUp, code);
        markCompletionPending(verified.userId);
        await completeAccount(verified.userId, verified.sessionId);
      }}
    />
  );
}
