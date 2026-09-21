import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { AuthScaffold } from "../components/AuthScaffold";
import { AppText } from "../components/controls";

export interface SignupStepScaffoldProps {
  readonly step: 1 | 2 | 3 | 4 | 5 | 6;
  readonly stepName: string;
  readonly headline: string;
  readonly subtitle: string;
  readonly onBack: () => void;
  readonly showBack?: boolean;
  readonly children: ReactNode;
  readonly testID: string;
}

export function SignupStepScaffold({
  children,
  ...props
}: SignupStepScaffoldProps) {
  const router = useRouter();
  return (
    <AuthScaffold {...props}>
      {children}
      {props.showBack !== false ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Already have an account? Sign in"
          onPress={() => router.replace("/login")}
          style={{
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText color="textSecondary">
            Already have an account?{" "}
            <AppText color="socialAccent" style={{ fontWeight: "600" }}>
              Sign in
            </AppText>
          </AppText>
        </Pressable>
      ) : null}
    </AuthScaffold>
  );
}
