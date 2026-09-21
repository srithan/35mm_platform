import { useAuthPalette } from "@/features/auth/components/palette";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, View } from "react-native";

export function BootstrapLoadingSurface() {
  const colors = useAuthPalette();
  return (
    <View
      accessibilityLabel="35mm is loading"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.loading, { backgroundColor: colors.paper }]}
      testID="app-bootstrap-loading"
    >
      <StatusBar style={colors.paper === "#000000" ? "light" : "dark"} />
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        resizeMode="contain"
        source={require("../../assets/launch/launch-wordmark.png")}
        style={[styles.wordmark, { tintColor: colors.ink }]}
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
