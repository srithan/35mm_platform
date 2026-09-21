import { useLocalSearchParams, useRouter } from "expo-router";

import { PasswordResetCompleteScreen } from "@/features/auth/password/PasswordResetCompleteScreen";

export default function PasswordResetCompleteRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode = rawMode === "activated" ? "activated" : "login";

  return (
    <PasswordResetCompleteScreen
      mode={mode}
      onContinue={() => {
        if (mode === "activated") {
          router.replace("/");
          return;
        }
        router.replace("/login");
      }}
    />
  );
}
