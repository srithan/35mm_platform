import { useAuth } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import {
  resendLoginEmailCode,
  startPasswordLogin,
  verifyLoginEmailCode,
} from "@/features/auth/login/clerk";
import { LoginScreen } from "@/features/auth/login/LoginScreen";

export default function LoginRoute() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isSignInLoaded, setActive, signIn } = useSignIn();
  const navigationStartedRef = useRef(false);
  const isReady = isAuthLoaded && isSignInLoaded && Boolean(signIn && setActive);

  const activateSession = useCallback(
    async (sessionId: string) => {
      if (!setActive) throw new Error("Clerk session activation is unavailable");
      await setActive({ session: sessionId });
      if (!navigationStartedRef.current) {
        navigationStartedRef.current = true;
        router.replace("/");
      }
    },
    [router, setActive],
  );

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    router.replace("/");
  }, [isAuthLoaded, isSignedIn, router]);

  return (
    <LoginScreen
      isReady={isReady}
      onBack={() => router.back()}
      onCreateAccount={() => router.replace("/signup/name")}
      onResend={async () => {
        if (!signIn) throw new Error("Clerk sign-in is unavailable");
        await resendLoginEmailCode(signIn);
      }}
      onSignIn={async (input) => {
        if (!signIn) throw new Error("Clerk sign-in is unavailable");
        const step = await startPasswordLogin(signIn, input);
        if (step.status === "complete") await activateSession(step.sessionId);
        return step;
      }}
      onVerify={async (code) => {
        if (!signIn) throw new Error("Clerk sign-in is unavailable");
        const sessionId = await verifyLoginEmailCode(signIn, code);
        await activateSession(sessionId);
      }}
    />
  );
}
