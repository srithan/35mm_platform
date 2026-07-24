import { useRouter } from "expo-router";

import { SignupEmailScreen } from "@/features/auth/signup/SignupEmailScreen";

export default function SignupEmailRoute() {
  const router = useRouter();

  return (
    <SignupEmailScreen
      onBack={() => router.back()}
      onContinue={() => router.push("./password")}
    />
  );
}
