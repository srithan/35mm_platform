import {
  MobileUIProvider,
  SafeAreaProvider,
  ToastProvider,
  mobileFontAssets,
} from "@35mm/mobile-ui";
import { useFonts } from "expo-font";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";
import {
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { BootstrapLoadingSurface } from "@/providers/bootstrapLoading";
import { useMobileUiStore } from "@/state/ui";

const NativeGestureHandlerRootView = GestureHandlerRootView as ComponentType<
  PropsWithChildren<{ readonly style?: StyleProp<ViewStyle> }>
>;

export function MobileUiBootstrapProvider({ children }: { readonly children: ReactNode }) {
  const [fontsLoaded, fontError] = useFonts(mobileFontAssets);
  const themePreference = useMobileUiStore((state) => state.themePreference);

  if (fontError) throw fontError;
  if (!fontsLoaded) {
    return (
      <NativeGestureHandlerRootView style={styles.root}>
        <BootstrapLoadingSurface />
      </NativeGestureHandlerRootView>
    );
  }

  return (
    <NativeGestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <MobileUIProvider preference={themePreference}>
          <ToastProvider>{children}</ToastProvider>
        </MobileUIProvider>
      </SafeAreaProvider>
    </NativeGestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
