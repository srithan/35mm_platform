import { themes } from "@35mm/design-tokens";
import { Image, StyleSheet, View } from "react-native";

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
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        resizeMode="contain"
        source={require("../../assets/launch/launch-wordmark.png")}
        style={styles.wordmark}
        testID="app-bootstrap-wordmark"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  wordmark: {
    height: 56,
    width: 151,
  },
});
