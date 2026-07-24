import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect, type ReactNode } from "react";

import { useSignupDraftStore } from "@/features/auth/signup/draft";
import { BootstrapLoadingSurface } from "@/providers/bootstrapLoading";

export function shouldRecoverSignupCompletion(input: {
  readonly isSignedIn: boolean;
  readonly userId: string | null | undefined;
  readonly completionUserId: string | null;
}): boolean {
  return Boolean(
    input.isSignedIn &&
      input.userId &&
      input.completionUserId === input.userId,
  );
}

export function SignupCompletionRecoveryGate({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const hasHydrated = useSignupDraftStore((state) => state.hasHydrated);
  const completionUserId = useSignupDraftStore(
    (state) => state.completionUserId,
  );

  useEffect(() => {
    if (hasHydrated) return;
    void useSignupDraftStore.persist.rehydrate();
  }, [hasHydrated]);

  if (!isLoaded || !hasHydrated) {
    return <BootstrapLoadingSurface />;
  }
  if (
    shouldRecoverSignupCompletion({
      isSignedIn: Boolean(isSignedIn),
      userId,
      completionUserId,
    })
  ) {
    return <Redirect href="./(auth)/signup/verify" />;
  }
  return <>{children}</>;
}
