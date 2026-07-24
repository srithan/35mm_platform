import { useSignUp } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";

import {
  canResumeEmailCodeSignUp,
  SignupFlowError,
  startEmailCodeSignUp,
} from "@/features/auth/signup/clerk";
import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { SignupDobScreen } from "@/features/auth/signup/SignupDobScreen";

export default function SignupDobRoute() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();
  const displayName = useSignupDraftStore((state) => state.displayName);
  const username = useSignupDraftStore((state) => state.username);
  const email = useSignupDraftStore((state) => state.email);
  const markEmailVerificationSent = useSignupDraftStore(
    (state) => state.markEmailVerificationSent,
  );
  const canResumeAccountAttempt =
    isLoaded &&
    canResumeEmailCodeSignUp(signUp, {
      displayName,
      email,
      username,
    });

  return (
    <SignupDobScreen
      canResumeAccountAttempt={canResumeAccountAttempt}
      isAuthReady={isLoaded}
      onBack={() => router.back()}
      onCreateAccount={async (input, onAccountCreated) => {
        if (!isLoaded) {
          throw new SignupFlowError(
            "CLERK_NOT_READY",
            "Account services are still loading. Try again.",
          );
        }
        await startEmailCodeSignUp(
          signUp,
          input,
          onAccountCreated,
        );
        markEmailVerificationSent(Date.now());
      }}
      onContinue={() => router.push("./verify")}
    />
  );
}
