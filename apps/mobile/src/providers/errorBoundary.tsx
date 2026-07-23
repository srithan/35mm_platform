import { themes } from "@35mm/design-tokens";
import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { reportMobileDiagnostic } from "@/services/diagnostics";

interface RootErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onReset?: () => void;
}

interface RootErrorBoundaryState {
  readonly error: Error | null;
  readonly revision: number;
}

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  override state: RootErrorBoundaryState = { error: null, revision: 0 };

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    reportMobileDiagnostic({
      source: "error-boundary",
      code: error.name || "UNEXPECTED_RENDER_ERROR",
      operation: "app.render",
    });
  }

  private readonly reset = () => {
    this.props.onReset?.();
    this.setState((state) => ({ error: null, revision: state.revision + 1 }));
  };

  override render() {
    if (!this.state.error) {
      return <Fragment key={this.state.revision}>{this.props.children}</Fragment>;
    }
    const colors = themes.light.colors;
    return (
      <View
        accessibilityViewIsModal
        style={[styles.screen, { backgroundColor: colors.surface }]}
        testID="root-error-boundary"
      >
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          35mm could not finish loading. Retry the app surface.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={this.reset}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? colors.accentPressed : colors.accent },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: colors.onAccent }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  body: { fontSize: 16, lineHeight: 24, textAlign: "center", maxWidth: 360 },
  button: {
    minHeight: 48,
    minWidth: 160,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 8,
  },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
});
