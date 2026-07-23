import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Counter,
  Divider,
  IconButton,
  InlineNotice,
  MobileUIProvider,
  Screen,
  SkeletonAvatar,
  SkeletonBlock,
  SkeletonText,
  StateSurface,
  TextField,
} from "@35mm/mobile-ui";
import { spacing } from "@35mm/design-tokens";

type GallerySection = "controls" | "states";

/**
 * Internal Phase 1 foundation surface. Development and preview are the only
 * configured app variants, so this cannot be mistaken for a production route.
 * Phase 2 replaces the root route with the real bootstrap state machine.
 */
export function FoundationGallery() {
  const [section, setSection] = useState<GallerySection>("controls");
  const [themeId, setThemeId] = useState<"light" | "dark">("light");
  const toggleTheme = useCallback(() => {
    setThemeId((current) => (current === "light" ? "dark" : "light"));
  }, []);

  return (
    <MobileUIProvider
      preference={themeId}
      systemColorScheme={themeId}
      reduceMotion
    >
      <Screen
        testID="foundation.gallery"
        accessibilityLabel="Internal mobile foundation gallery"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText role="wordmark">35mm</AppText>
              <AppText role="screenTitle" accessibilityRole="header">
                Foundation gallery
              </AppText>
              <AppText color="textSecondary">
                Internal accessibility, visual, E2E, and performance surface.
              </AppText>
            </View>
            <IconButton
              testID="foundation.theme.toggle"
              icon="settings"
              label={`Use ${themeId === "light" ? "dark" : "light"} theme`}
              onPress={toggleTheme}
              style={styles.themeToggle}
            />
          </View>

          <View
            testID="foundation.gallery.canvas"
            accessibilityLabel={`${section} gallery in ${themeId} theme`}
            style={styles.canvas}
          >
            <View style={styles.sectionTabs} accessibilityRole="tablist">
              <Chip
                testID="foundation.section.controls"
                label="Controls"
                selected={section === "controls"}
                accessibilityRole="tab"
                onPress={() => setSection("controls")}
              />
              <Chip
                testID="foundation.section.states"
                label="States"
                selected={section === "states"}
                accessibilityRole="tab"
                onPress={() => setSection("states")}
              />
            </View>

            {section === "controls" ? <ControlsGallery /> : <StatesGallery />}
          </View>
        </ScrollView>
      </Screen>
    </MobileUIProvider>
  );
}

function ControlsGallery() {
  return (
    <View testID="foundation.controls" style={styles.stack}>
      <Card variant="outlined" style={styles.stack}>
        <AppText role="sectionTitle" accessibilityRole="header">
          Identity and counters
        </AppText>
        <View style={styles.row}>
          <Avatar label="35mm member avatar" avatarSize="large" />
          <View style={styles.identityCopy}>
            <AppText role="rowLabel">Cinema Friend</AppText>
            <AppText role="metadata" color="textSecondary">
              @cinema_friend
            </AppText>
          </View>
          <Badge count={128} tone="accent" />
        </View>
        <View style={styles.row}>
          <Counter icon="heart" value="1.2K" label="Likes" active />
          <Counter icon="message" value={48} label="Replies" />
          <Counter icon="repost" value={17} label="Reposts" />
        </View>
      </Card>

      <Card variant="sunken" style={styles.stack}>
        <AppText role="sectionTitle" accessibilityRole="header">
          Inputs and actions
        </AppText>
        <TextField
          label="Search films"
          value="The Third Man"
          leadingIcon="search"
          onChangeText={() => undefined}
        />
        <View style={styles.rowWrap}>
          <Button label="Primary action" icon="chevron-right" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Disabled" disabled />
        </View>
        <View style={styles.rowWrap}>
          <Chip label="Drama" selected />
          <Chip label="Thriller" />
          <Chip label="Unavailable" disabled />
        </View>
      </Card>

      <InlineNotice
        tone="success"
        title="Accessible by default"
        message="Controls expose roles, names, states, and minimum touch targets."
      />
    </View>
  );
}

function StatesGallery() {
  return (
    <View testID="foundation.states" style={styles.stack}>
      <Card variant="outlined" style={styles.stack}>
        <AppText role="sectionTitle" accessibilityRole="header">
          Loading
        </AppText>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading foundation content"
          style={styles.loadingRow}
        >
          <SkeletonAvatar avatarSize="medium" />
          <View style={styles.skeletonCopy}>
            <SkeletonText style={{ width: "68%" }} />
            <SkeletonText style={{ width: "42%" }} />
          </View>
          <SkeletonBlock width={56} height={28} borderRadius={14} />
        </View>
      </Card>

      <StateSurface
        testID="foundation.state.offline"
        kind="offline"
        title="You’re offline"
        message="Readable cached content stays available. Retry after reconnecting."
        primaryAction={{ label: "Retry", onPress: () => undefined }}
        compact
      />
      <Divider />
      <StateSurface
        testID="foundation.state.error"
        kind="error"
        title="Couldn’t load this page"
        message="Failure stays explicit and recoverable."
        primaryAction={{ label: "Try again", onPress: () => undefined }}
        secondaryAction={{ label: "Go back", onPress: () => undefined }}
        compact
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  themeToggle: {
    marginRight: spacing.huge,
  },
  canvas: {
    gap: spacing.md,
  },
  sectionTabs: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  rowWrap: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  identityCopy: {
    flex: 1,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  skeletonCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
