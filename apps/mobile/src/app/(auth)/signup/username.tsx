import { useRouter } from "expo-router";

import { SignupUsernameScreen } from "@/features/auth/signup/SignupUsernameScreen";
import { useApiClient } from "@/services/api";

export default function SignupUsernameRoute() {
  const router = useRouter();
  const client = useApiClient();

  return (
    <SignupUsernameScreen
      client={client}
      onBack={() => router.back()}
      onContinue={() => router.push("./email")}
    />
  );
}
