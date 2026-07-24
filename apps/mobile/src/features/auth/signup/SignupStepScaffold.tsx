import {
  AppText,
  IconButton,
  MobileUIProvider,
  Screen,
  useMobileUI,
} from "@35mm/mobile-ui";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const SIGNUP_STEP_COUNT = 5;

export interface SignupStepScaffoldProps {
  readonly step: 1 | 2 | 3 | 4 | 5;
  readonly stepName: string;
  readonly headline: string;
  readonly subtitle: string;
  readonly onBack: () => void;
  readonly showBack?: boolean;
  readonly children: ReactNode;
  readonly testID: string;
}

export function SignupStepScaffold(props: SignupStepScaffoldProps) {
  const { reduceMotion } = useMobileUI();
  return (
    <MobileUIProvider
      preference="light"
      reduceMotion={reduceMotion}
      systemColorScheme="light"
    >
      <SignupStepContent {...props} />
    </MobileUIProvider>
  );
}

function SignupStepContent({
  step,
  stepName,
  headline,
  subtitle,
  onBack,
  showBack = true,
  children,
  testID,
}: SignupStepScaffoldProps) {
  const testPrefix = testID.endsWith("-screen")
    ? testID.slice(0, -"-screen".length)
    : testID;

  return (
    <Screen
      safeAreaEdges={["top", "left", "right", "bottom"]}
      style={styles.screen}
      testID={testID}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            {showBack ? (
              <IconButton
                accessibilityHint={
                  step === 1
                    ? "Return to Welcome"
                    : `Return to signup step ${step - 1}`
                }
                icon="back"
                label="Back"
                onPress={onBack}
                testID={`${testPrefix}-back`}
              />
            ) : (
              <View accessibilityElementsHidden style={styles.topBarSpacer} />
            )}
            <AppText role="rowLabelCompact">Create account</AppText>
            <View accessibilityElementsHidden style={styles.topBarSpacer} />
          </View>

          <ImageBackground
            accessible={false}
            imageStyle={styles.heroImage}
            importantForAccessibility="no-hide-descendants"
            resizeMode="cover"
            source={require("../../../../assets/images/welcome-hero.png")}
            style={styles.hero}
            testID={`${testPrefix}-hero`}
          />

          <View
            accessible
            accessibilityLabel={`Signup step ${step} of ${SIGNUP_STEP_COUNT}: ${stepName}`}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 1,
              max: SIGNUP_STEP_COUNT,
              now: step,
            }}
            style={styles.progress}
            testID="signup-progress"
          >
            {Array.from({ length: SIGNUP_STEP_COUNT }, (_, index) => {
              const segmentStep = index + 1;
              return (
                <View
                  key={segmentStep}
                  style={[
                    styles.progressSegment,
                    segmentStep === step
                      ? styles.progressSegmentActive
                      : segmentStep < step
                        ? styles.progressSegmentComplete
                        : styles.progressSegmentInactive,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.content}>
            <View style={styles.heading}>
              <AppText accessibilityRole="header" align="center" role="display">
                {headline}
              </AppText>
              <AppText
                align="center"
                color="textSecondary"
                role="bodyLarge"
              >
                {subtitle}
              </AppText>
            </View>

            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 26,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  flex: {
    flex: 1,
  },
  heading: {
    alignItems: "center",
    gap: 12,
  },
  hero: {
    height: 176,
    width: "100%",
  },
  heroImage: {
    backgroundColor: "#C2473A",
    opacity: 0.92,
  },
  progress: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    paddingBottom: 18,
    paddingTop: 16,
  },
  progressSegment: {
    borderRadius: 999,
    height: 7,
  },
  progressSegmentActive: {
    backgroundColor: "#141210",
    width: 28,
  },
  progressSegmentComplete: {
    backgroundColor: "#141210",
    width: 9,
  },
  progressSegmentInactive: {
    backgroundColor: "#14121024",
    width: 9,
  },
  screen: {
    backgroundColor: "#FFFAF2",
  },
  scrollContent: {
    flexGrow: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 8,
  },
  topBarSpacer: {
    height: 44,
    width: 44,
  },
});
