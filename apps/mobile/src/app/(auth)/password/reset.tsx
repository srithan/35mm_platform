import { useAuth } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import { completePasswordReset } from "@/features/auth/password/clerk";
import { NewPasswordScreen } from "@/features/auth/password/NewPasswordScreen";

export default function NewPasswordRoute() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isSignInLoaded, setActive, signIn } = useSignIn();
  const navigationStartedRef = useRef(false);
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
    <NewPasswordScreen
      isReady={isReady}
      onBack={() => router.back()}
      onSubmit={async (password) => {
        if (!signIn) throw new Error("Clerk sign-in is unavailable");
        const result = await completePasswordReset(signIn, password);
        if (result.sessionId) {
          await activateSession(result.sessionId);
          return;
        }
        router.replace({
          pathname: "./complete",
          params: { mode: "login" },
        });
      }}
    />
  );
}
