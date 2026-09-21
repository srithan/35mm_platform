import { AppIcon } from "@35mm/mobile-ui";
import { AppText, Button } from "../components/controls";
import { StyleSheet, View } from "react-native";

import { PasswordResetScaffold } from "@/features/auth/password/PasswordResetScaffold";

export interface PasswordResetCompleteScreenProps {
  readonly mode: "activated" | "login";
  readonly onContinue: () => void;
}

export function PasswordResetCompleteScreen({
  mode,
  onContinue,
}: PasswordResetCompleteScreenProps) {
  return (
    <PasswordResetScaffold
      headline={"Password\nupdated."}
      onBack={onContinue}
      subtitle={
        mode === "activated"
          ? "You’re signed in with your new password."
          : "Use your new password the next time you log in."
      }
      testID="password-reset-complete-screen"
    >
      <View style={styles.content}>
        <View
          accessibilityLabel="Password reset complete"
          accessibilityRole="image"
          style={styles.successMark}
          testID="password-reset-complete-mark"
        >
          <AppIcon color="#FFFFFF" name="check" size="large" />
        </View>
        <AppText align="center" color="textSecondary" role="body">
          {mode === "activated"
            ? "You can return to 35mm now."
            : "Go back to Login and continue."}
        </AppText>
        <Button
          fullWidth
          label={mode === "activated" ? "Continue" : "Log in"}
          onPress={onContinue}
          size="large"
          testID="password-reset-complete-continue"
        />
      </View>
    </PasswordResetScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: 20,
  },
  successMark: {
    alignItems: "center",
    backgroundColor: "#2F8F5B",
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
});
