import {
  AppIcon,
  AppText,
  Button,
  MobileUIProvider,
  Screen,
  useMobileUI,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

const TERMS_URL = "https://35mm.in/terms";
const PRIVACY_URL = "https://35mm.in/privacy";
type LegalUrl = typeof TERMS_URL | typeof PRIVACY_URL;

export function WelcomeScreen() {
  const { reduceMotion } = useMobileUI();
  return (
    <MobileUIProvider
      preference="light"
      reduceMotion={reduceMotion}
      systemColorScheme="light"
    >
      <WelcomeContent />
    </MobileUIProvider>
  );
}

function WelcomeContent() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [legalError, setLegalError] = useState<string | null>(null);
  const heroHeight = useMemo(
    () => Math.min(480, Math.max(300, height * 0.52)),
    [height],
  );
  const openLegal = useCallback((url: LegalUrl) => {
    setLegalError(null);
    void Linking.openURL(url).catch(() => {
      setLegalError("35mm couldn’t open that page. Please try again.");
    });
  }, []);

  return (
    <Screen
      safeAreaEdges={["left", "right", "bottom"]}
      style={styles.screen}
      testID="welcome-screen"
    >
      <StatusBar style="light" />
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          accessible={false}
          imageStyle={styles.heroImage}
          importantForAccessibility="no-hide-descendants"
          resizeMode="cover"
          source={require("../../../../assets/images/welcome-hero.png")}
          style={[styles.hero, { height: heroHeight }]}
          testID="welcome-hero"
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.heroMark,
              {
                backgroundColor: "#FFFFFF29",
                borderColor: "#FFFFFF5C",
              },
            ]}
          >
            <AppIcon
              color="#FFFFFF"
              name="clapperboard"
              size={34}
              strokeWidth={2.4}
            />
          </View>
          <AppText role="wordmark" style={styles.heroWordmark}>
            35mm
          </AppText>
        </ImageBackground>

        <View style={styles.copy}>
          <AppText accessibilityRole="header" align="center" role="display">
            {"Your life,\nin film."}
          </AppText>
          <AppText
            align="center"
            color="textSecondary"
            role="bodyLarge"
            style={styles.subtitle}
          >
            Track what you watch, share your take, and discover what moves you
            next.
          </AppText>
        </View>

        <View style={styles.actions}>
          <Button
            accessibilityHint="Create your 35mm account"
            fullWidth
            label="Start your journey"
            onPress={() => router.push("./signup/name")}
            size="large"
            testID="welcome-start"
          />
          <View style={styles.loginRow}>
            <AppText color="textSecondary" role="metadata">
              Already have an account?
            </AppText>
            <Pressable
              accessibilityHint="Open 35mm account login"
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.push("./login")}
              style={styles.inlineLink}
              testID="welcome-login"
            >
              <AppText role="authorName">Log in</AppText>
            </Pressable>
          </View>
          <View style={styles.legal}>
            <AppText align="center" color="textTertiary" role="metadata">
              By continuing, you agree to 35mm’s
            </AppText>
            <View style={styles.legalLinks}>
              <Pressable
                accessibilityHint="Opens the 35mm Terms of Service"
                accessibilityRole="link"
                onPress={() => openLegal(TERMS_URL)}
                style={styles.legalTarget}
                testID="welcome-terms"
              >
                <AppText role="metadata" style={styles.legalLabel}>
                  Terms of Service
                </AppText>
              </Pressable>
              <AppText color="textTertiary" role="metadata">
                and
              </AppText>
              <Pressable
                accessibilityHint="Opens the 35mm Privacy Policy"
                accessibilityRole="link"
                onPress={() => openLegal(PRIVACY_URL)}
                style={styles.legalTarget}
                testID="welcome-privacy"
              >
                <AppText role="metadata" style={styles.legalLabel}>
                  Privacy Policy
                </AppText>
              </Pressable>
            </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 2,
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  copy: {
    alignItems: "center",
    gap: 14,
    paddingBottom: 26,
    paddingHorizontal: 28,
    paddingTop: 4,
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  heroImage: {
    backgroundColor: "#C2473A",
  },
  heroMark: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  heroWordmark: {
    color: "#FFFFFF",
    marginTop: 12,
  },
  inlineLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  legal: {
    alignItems: "center",
    marginTop: 2,
  },
  legalLabel: {
    textDecorationLine: "underline",
  },
  legalLinks: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
  },
  legalTarget: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  loginRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    minHeight: 44,
  },
  screen: {
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  subtitle: {
    maxWidth: 340,
  },
});
