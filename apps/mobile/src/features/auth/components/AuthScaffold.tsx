import { AppIcon, useMobileUI } from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { AppText, Screen } from "./controls";
import { useAuthPalette } from "./palette";

function ProgressDot({
  index,
  step,
}: {
  readonly index: number;
  readonly step: number;
}) {
  const colors = useAuthPalette();
  const { reduceMotion } = useMobileUI();
  const style = useAnimatedStyle(() => ({
    width: withTiming(index === step ? 26 : 8, {
      duration: reduceMotion ? 0 : 240,
    }),
  }));
  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.ink,
          opacity: index <= step ? 1 : 0.14,
        },
        style,
      ]}
    />
  );
}

export function AuthScaffold({
  children,
  onBack,
  showBack = true,
  title,
  headline,
  subtitle,
  step,
  stepName,
  testID,
}: {
  readonly children: ReactNode;
  readonly onBack: () => void;
  readonly showBack?: boolean;
  readonly title?: string;
  readonly headline?: string;
  readonly subtitle?: string;
  readonly step?: number;
  readonly stepName?: string;
  readonly testID: string;
}) {
  const c = useAuthPalette();
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const prefix = testID.replace(/-screen$/, "");
  return (
    <Screen testID={testID}>
      <StatusBar style={c.paper === "#000000" ? "light" : "dark"} />
      <View
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 8,
        }}
      >
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            testID={`${prefix}-back`}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="back" color={c.ink} size={24} />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
        {step ? (
          <View
            accessible
            accessibilityLabel={`Signup step ${step} of 6: ${stepName}`}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: 6, now: step }}
            testID="signup-progress"
            style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
          >
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <ProgressDot key={index} index={index} step={step} />
            ))}
          </View>
        ) : (
          <AppText style={{ fontSize: 17, fontWeight: "600" }}>{title}</AppText>
        )}
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
          onContentSizeChange={(_width, height) => setContentHeight(height)}
          scrollEnabled={contentHeight > viewport + 1}
          bounces={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: headline ? 38 : 16,
            paddingBottom: 40,
            gap: 26,
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
          }}
        >
          {headline ? (
            <View style={{ gap: 10 }}>
              <AppText accessibilityRole="header" role="display">
                {headline}
              </AppText>
              {subtitle ? (
                <AppText color="textSecondary" role="bodyLarge">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
