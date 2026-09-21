import { useRouter } from "expo-router";

import { SignupNameScreen } from "@/features/auth/signup/SignupNameScreen";

export default function SignupNameRoute() {
  const router = useRouter();

  return (
    <SignupNameScreen
      onBack={() => router.back()}
      onContinue={() => router.push("./username")}
    />
  );
}
