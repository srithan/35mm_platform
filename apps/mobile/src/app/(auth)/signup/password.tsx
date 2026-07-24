import { useRouter } from "expo-router";

import { SignupPasswordScreen } from "@/features/auth/signup/SignupPasswordScreen";

export default function SignupPasswordRoute() {
  const router = useRouter();

  return (
    <SignupPasswordScreen
      onBack={() => router.back()}
      onContinue={() => router.push("./dob")}
    />
  );
}
