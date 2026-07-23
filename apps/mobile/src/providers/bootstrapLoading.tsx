import { themes } from "@35mm/design-tokens";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function BootstrapLoadingSurface() {
  const colors = themes.light.colors;
  return (
    <View
      accessibilityLabel="35mm is loading"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.loading, { backgroundColor: colors.surface }]}
      testID="app-bootstrap-loading"
    >
      <Text style={[styles.wordmark, { color: colors.text }]}>35mm</Text>
      <ActivityIndicator color={colors.accent} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
  },
});
