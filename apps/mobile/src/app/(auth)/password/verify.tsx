import { useAuth } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import {
  resendPasswordResetCode,
  verifyPasswordResetCode,
} from "@/features/auth/password/clerk";
import { VerifyPasswordResetScreen } from "@/features/auth/password/VerifyPasswordResetScreen";

function paramValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function VerifyPasswordResetRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    target?: string;
  }>();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isSignInLoaded, setActive, signIn } = useSignIn();
  const navigationStartedRef = useRef(false);
  const email = paramValue(params.email).trim();
  const target = paramValue(params.target).trim() || "that email address";
  const isReady =
    isAuthLoaded && isSignInLoaded && Boolean(signIn && setActive);

  const activateSession = useCallback(
    async (sessionId: string) => {
      if (!setActive) throw new Error("Clerk session activation is unavailable");
      await setActive({ session: sessionId });
      router.replace({
        pathname: "./complete",
        params: { mode: "activated" },
      });
    },
    [router, setActive],
  );

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    router.replace("/");
  }, [isAuthLoaded, isSignedIn, router]);

  return (
    <VerifyPasswordResetScreen
      isReady={isReady}
      onBack={() => router.back()}
      onResend={async () => {
        if (!signIn) throw new Error("Clerk sign-in is unavailable");
        await resendPasswordResetCode(signIn, email);
      }}
      onVerify={async (code) => {
        if (!signIn) throw new Error("Clerk sign-in is unavailable");
        const step = await verifyPasswordResetCode(signIn, code);
        if (step.status === "needs_new_password") {
          router.push("./reset");
          return;
        }
        if (step.sessionId) {
          await activateSession(step.sessionId);
          return;
        }
        router.replace({
          pathname: "./complete",
          params: { mode: "login" },
        });
      }}
      target={target}
    />
  );
}
