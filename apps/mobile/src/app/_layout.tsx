import * as SplashScreen from "expo-splash-screen";
import { Slot } from "expo-router";
import { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { AppProviders } from "@/providers";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hasHiddenNativeSplash = useRef(false);
  const handleRootLayout = useCallback(() => {
    if (hasHiddenNativeSplash.current) return;
    hasHiddenNativeSplash.current = true;
    SplashScreen.hide();
  }, []);

  return (
    <View
      onLayout={handleRootLayout}
      style={styles.root}
      testID="native-splash-root"
    >
      <AppProviders>
        <Slot />
      </AppProviders>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
});
