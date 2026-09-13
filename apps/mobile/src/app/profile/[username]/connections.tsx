import { StateSurface } from "@35mm/mobile-ui";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { ProfileConnectionsScreen } from "@/features/profile/ProfileConnectionsScreen";
import type { ProfileConnectionsKind } from "@/features/profile/queryKeys";

export default function ProfileConnectionsRoute() {
  const params = useLocalSearchParams<{ username?: string; kind?: string }>();
  const username = typeof params.username === "string" ? params.username.trim().toLowerCase() : "";
  const kind = params.kind === "following" ? "following" : params.kind === "followers" ? "followers" : null;
  if (!username || !kind) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <StateSurface kind="error" title="Invalid connections" message="Profile connection route is incomplete." />
      </View>
    );
  }
  return <ProfileConnectionsScreen kind={kind as ProfileConnectionsKind} username={username} />;
}
