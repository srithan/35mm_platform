import {
  AppIcon,
  AppText,
  Button,
  Screen,
  useMobileUI,
} from "@35mm/mobile-ui";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { BootstrapLoadingSurface } from "@/providers/bootstrapLoading";
import {
  useAuthBootstrap,
  type AuthBootstrapDestination,
} from "@/features/auth/bootstrap/useAuthBootstrap";

export function AuthBootstrapGate({
  children,
}: {
  readonly children: (destination: AuthBootstrapDestination) => ReactNode;
}) {
  const controller = useAuthBootstrap();
  const { theme } = useMobileUI();

  if (controller.state.status === "loading") {
    return <BootstrapLoadingSurface />;
  }
  if (controller.state.status !== "recovery") {
    return <>{children(controller.state)}</>;
  }

  const isBusy = controller.isRetrying || controller.isSigningOut;
  return (
    <Screen padded testID="auth-bootstrap-recovery">
      <View
        accessibilityRole="alert"
        style={styles.content}
        testID="auth-bootstrap-alert"
      >
        <AppIcon
          accessibilityLabel={
            controller.state.kind === "offline"
              ? "Connection unavailable"
              : "Session unavailable"
          }
          color={theme.colors.destructive}
          name={controller.state.kind === "offline" ? "wifi-off" : "warning"}
          size="large"
        />
        <View style={styles.copy}>
          <AppText accessibilityRole="header" align="center" role="screenTitle">
            Session paused
          </AppText>
          <AppText align="center" color="textSecondary">
            {controller.state.message}
          </AppText>
          {controller.actionError ? (
            <AppText
              accessibilityLiveRegion="assertive"
              align="center"
              color="destructive"
              role="metadata"
            >
              {controller.actionError}
            </AppText>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button
            accessibilityHint="Attempts to restore your 35mm session again"
            disabled={isBusy}
            fullWidth
            label="Retry"
            loading={controller.isRetrying}
            onPress={controller.retry}
            testID="auth-bootstrap-retry"
          />
          <Button
            accessibilityHint="Clears this session and returns to signed-out access"
            disabled={isBusy}
            fullWidth
            label="Sign out"
            loading={controller.isSigningOut}
            onPress={controller.signOut}
            testID="auth-bootstrap-sign-out"
            variant="secondary"
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignSelf: "stretch",
    gap: 12,
    marginTop: 10,
  },
  content: {
    alignItems: "center",
    flex: 1,
    gap: 22,
    justifyContent: "center",
    marginHorizontal: "auto",
    maxWidth: 430,
    width: "100%",
  },
  copy: {
    alignItems: "center",
    gap: 8,
  },
});
