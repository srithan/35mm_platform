import { useAuth } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { startPasswordReset } from "@/features/auth/password/clerk";
import { ForgotPasswordScreen } from "@/features/auth/password/ForgotPasswordScreen";

export default function ForgotPasswordRoute() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const navigationStartedRef = useRef(false);
  const isReady = isAuthLoaded && isSignInLoaded && Boolean(signIn);

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    router.replace("/");
  }, [isAuthLoaded, isSignedIn, router]);

  return (
    <ForgotPasswordScreen
      isReady={isReady}
      onBack={() => router.back()}
      onSubmit={async (email) => {
        if (!signIn) throw new Error("Clerk sign-in is unavailable");
        const result = await startPasswordReset(signIn, email);
        router.push({
          pathname: "./verify",
          params: {
            email,
            target: result.safeIdentifier ?? "that email address",
          },
        });
      }}
    />
  );
}
