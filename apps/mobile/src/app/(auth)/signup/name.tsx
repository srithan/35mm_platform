import { useRouter } from "expo-router";

import { SignupNameScreen } from "@/features/auth/signup/SignupNameScreen";
import { useApiClient } from "@/services/api";

export default function SignupNameRoute() {
  const router = useRouter();
  const client = useApiClient();

  return (
    <SignupNameScreen
      client={client}
      onBack={() => router.back()}
      onContinue={() => router.push("./email")}
    />
  );
}
