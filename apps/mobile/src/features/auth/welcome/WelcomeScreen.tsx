import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { AppText, Screen } from "../components/controls";
import { useAuthPalette } from "../components/palette";
import { WelcomePosterWall } from "./WelcomePosterWall";

export function WelcomeScreen() {
  const router = useRouter();
  const c = useAuthPalette();
  const { fontScale } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [legalError, setLegalError] = useState<string | null>(null);
  const scroll = fontScale > 1 || (height > 0 && height < 500);
  const openLegal = (
    url: "https://35mm.in/terms" | "https://35mm.in/privacy",
  ) => {
    setLegalError(null);
    void Linking.openURL(url).catch(() =>
      setLegalError("35mm couldn’t open that page. Please try again."),
    );
  };
  return (
    <Screen testID="welcome-screen">
      <StatusBar style={c.paper === "#000000" ? "light" : "dark"} />
      <View
        style={{ flex: 1 }}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <ScrollView
          bounces={false}
          scrollEnabled={scroll || Boolean(legalError)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            style={{
              height: scroll ? undefined : height || undefined,
              minHeight: scroll ? height : undefined,
              width: "100%",
              maxWidth: 560,
              alignSelf: "center",
            }}
          >
            <Image
              accessible
              accessibilityLabel="35mm"
              accessibilityRole="image"
              source={require("../../../../assets/launch/launch-wordmark.png")}
              resizeMode="contain"
              style={{
                width: 112,
                height: 42,
                tintColor: c.ink,
                alignSelf: "center",
                marginTop: 4,
                marginBottom: 16,
              }}
            />
            <View
              style={{
                flex: scroll ? undefined : 1,
                height: scroll ? 220 : undefined,
                minHeight: 100,
              }}
            >
              <WelcomePosterWall />
            </View>
            <View
              style={{
                gap: 8,
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 24,
              }}
            >
              <AppText
                accessibilityRole="header"
                align="center"
                role="screenTitle"
                style={{ fontStyle: "italic" }}
              >
                Your cinema. Your people.
              </AppText>
              <AppText align="center" color="textSecondary">
                The social network for all things cinema.
              </AppText>
            </View>
            <View style={{ gap: 10, paddingHorizontal: 24 }}>
              {(["Sign up", "Log in"] as const).map((label, index) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityHint={
                    index === 0
                      ? "Create your 35mm account"
                      : "Sign in to an existing 35mm account"
                  }
                  testID={index === 0 ? "welcome-start" : "welcome-login"}
                  onPress={() =>
                    router.push(index === 0 ? "/signup/name" : "/login")
                  }
                  style={({ pressed }) => ({
                    minHeight: 56,
                    borderRadius: 999,
                    paddingVertical: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: index === 0 ? c.ink : c.field,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <AppText
                    style={{
                      color: index === 0 ? c.paper : c.ink,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View
              style={{
                paddingHorizontal: 32,
                paddingTop: 14,
                paddingBottom: 4,
              }}
            >
              <AppText align="center" role="metadata" color="textSecondary">
                By continuing, you agree to our{" "}
                <AppText
                  role="metadata"
                  accessibilityRole="link"
                  testID="welcome-terms"
                  onPress={() => openLegal("https://35mm.in/terms")}
                  style={{ textDecorationLine: "underline" }}
                >
                  Terms of Service
                </AppText>{" "}
                and acknowledge our{" "}
                <AppText
                  role="metadata"
                  accessibilityRole="link"
                  testID="welcome-privacy"
                  onPress={() => openLegal("https://35mm.in/privacy")}
                  style={{ textDecorationLine: "underline" }}
                >
                  Privacy Policy
                </AppText>
                .
              </AppText>
              {legalError ? (
                <AppText
                  accessibilityLiveRegion="assertive"
                  align="center"
                  color="destructive"
                  role="metadata"
                  testID="welcome-legal-error"
                >
                  {legalError}
                </AppText>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
