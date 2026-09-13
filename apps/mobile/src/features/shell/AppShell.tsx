import {
  AppIcon,
  AppText,
  Avatar,
  Button,
  IconButton,
  Screen,
  StateSurface,
  useMobileUI,
} from "@35mm/mobile-ui";
import { spacing } from "@35mm/design-tokens";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";
import { BookmarksScreen } from "@/features/bookmarks/BookmarksScreen";
import { ChatScreen } from "@/features/chat/ChatScreen";
import { ListsScreen } from "@/features/lists/ListsScreen";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { VideoPostComposer } from "@/features/videos/VideoPostComposer";
import {
  DRAWER_DESTINATIONS,
  PRIMARY_TABS,
  SHELL_DESTINATIONS,
  type ShellDestinationId,
} from "./destinations";
import { HomeFeedScreen } from "./HomeFeedScreen";

export function AppShell({
  profile,
}: {
  readonly profile: CurrentUserBootstrapProfile;
}) {
  const { theme } = useMobileUI();
  const [activeDestination, setActiveDestination] = useState<ShellDestinationId>("home");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const active = SHELL_DESTINATIONS[activeDestination];
  const openDestination = (destination: ShellDestinationId) => {
    if (destination === "create") {
      setComposerVisible(true);
      return;
    }
    setActiveDestination(destination);
    setDrawerVisible(false);
  };
  const title = activeDestination === "profile" ? profile.displayName : active.title;
  const drawerItems = useMemo(
    () => DRAWER_DESTINATIONS.map((id) => SHELL_DESTINATIONS[id]),
    [],
  );

  return (
    <Screen safeAreaEdges={["top", "right", "bottom", "left"]} testID="app-shell">
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <IconButton icon="menu" label="Open navigation drawer" onPress={() => setDrawerVisible(true)} />
        <View style={styles.headerTitle}>
          <AppText accessibilityRole="header" numberOfLines={1} role="screenTitle">
            {title}
          </AppText>
          <AppText color="textSecondary" numberOfLines={1} role="metadata">
            35mm
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="search" label="Open search" onPress={() => openDestination("discover")} />
          <IconButton icon="message" label="Open chat" onPress={() => openDestination("chat")} />
        </View>
      </View>
      <View style={styles.content}>
        {activeDestination === "home" ? (
          <HomeFeedScreen profile={profile} onCompose={() => setComposerVisible(true)} />
        ) : activeDestination === "notifications" ? (
          <NotificationsScreen />
        ) : activeDestination === "bookmarks" ? (
          <BookmarksScreen currentUserId={profile.userId} />
        ) : activeDestination === "lists" ? (
          <ListsScreen />
        ) : activeDestination === "chat" ? (
          <ChatScreen profile={profile} />
        ) : activeDestination === "profile" ? (
          <ProfileScreen currentUser={profile} initialProfile={profile} username={profile.username} />
        ) : (
          <DestinationGate destinationId={activeDestination} />
        )}
      </View>
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        {PRIMARY_TABS.map((id) => {
          const item = SHELL_DESTINATIONS[id];
          const selected = activeDestination === id;
          return (
            <Pressable
              accessibilityLabel={item.title}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={id}
              onPress={() => openDestination(id)}
              testID={`shell-tab-${id}`}
              style={({ pressed }) => [
                styles.tabItem,
                { backgroundColor: pressed ? theme.colors.surfacePressed : "transparent" },
              ]}
            >
              <View>
                <AppIcon
                  name={item.icon}
                  color={selected ? theme.colors.accent : theme.colors.textSecondary}
                  filled={selected}
                />
              </View>
              <AppText
                color={selected ? "accent" : "textSecondary"}
                numberOfLines={1}
                role="metadata"
                style={styles.tabLabel}
              >
                {item.title}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <Drawer
        activeDestination={activeDestination}
        items={drawerItems}
        onClose={() => setDrawerVisible(false)}
        onOpenDestination={openDestination}
        profile={profile}
        visible={drawerVisible}
      />
      <VideoPostComposer visible={composerVisible} onRequestClose={() => setComposerVisible(false)} />
    </Screen>
  );
}

function DestinationGate({
  destinationId,
}: {
  readonly destinationId: ShellDestinationId;
}) {
  const destination = SHELL_DESTINATIONS[destinationId];
  return (
    <View style={styles.gate}>
      <StateSurface
        kind={destination.readiness === "product-gated" ? "permissionDenied" : "empty"}
        message={destination.gateMessage}
        title={destination.gateTitle}
      />
    </View>
  );
}

function Drawer({
  activeDestination,
  items,
  onClose,
  onOpenDestination,
  profile,
  visible,
}: {
  readonly activeDestination: ShellDestinationId;
  readonly items: readonly (typeof SHELL_DESTINATIONS)[ShellDestinationId][];
  readonly onClose: () => void;
  readonly onOpenDestination: (destination: ShellDestinationId) => void;
  readonly profile: CurrentUserBootstrapProfile;
  readonly visible: boolean;
}) {
  const { theme } = useMobileUI();
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.drawerRoot}>
        <Pressable accessibilityLabel="Close navigation drawer" onPress={onClose} style={styles.drawerBackdrop} />
        <View style={[styles.drawer, { backgroundColor: theme.colors.surfaceElevated }]}>
          <View style={styles.drawerHeader}>
            <Avatar
              avatarSize="medium"
              label={`${profile.displayName} avatar`}
              {...(profile.avatarUrl ? { source: { uri: profile.avatarUrl } } : {})}
            />
            <View style={styles.drawerIdentity}>
              <AppText role="rowLabel">{profile.displayName}</AppText>
              <AppText color="textSecondary" role="metadata">@{profile.username}</AppText>
              <AppText color="textSecondary" role="metadata">
                {profile.followerCount} followers · {profile.followingCount} following
              </AppText>
            </View>
            <IconButton icon="close" label="Close navigation drawer" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.drawerItems}>
            {items.map((item) => {
              const selected = activeDestination === item.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item.id}
                  onPress={() => onOpenDestination(item.id)}
                  testID={`drawer-destination-${item.id}`}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    {
                      backgroundColor: selected
                        ? theme.colors.surfaceSunken
                        : pressed
                          ? theme.colors.surfacePressed
                          : "transparent",
                    },
                  ]}
                >
                  <AppIcon
                    name={item.icon}
                    color={selected ? theme.colors.accent : theme.colors.text}
                    filled={selected}
                  />
                  <AppText role="rowLabelCompact">{item.title}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.drawerFooter}>
            <Button fullWidth icon="compose" label="Create" onPress={() => onOpenDestination("create")} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  drawer: {
    flex: 1,
    maxWidth: 336,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  drawerBackdrop: {
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.38)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  drawerFooter: {
    paddingTop: 12,
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 64,
  },
  drawerIdentity: {
    flex: 1,
  },
  drawerItem: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  drawerItems: {
    gap: 3,
    paddingVertical: 18,
  },
  drawerRoot: {
    flex: 1,
    flexDirection: "row",
  },
  gate: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screenHorizontal,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 8,
  },
  headerActions: {
    flexDirection: "row",
  },
  headerTitle: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 66,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 56,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
