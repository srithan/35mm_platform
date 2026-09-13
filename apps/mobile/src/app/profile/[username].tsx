import { StateSurface } from "@35mm/mobile-ui";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { ProfileScreen } from "@/features/profile/ProfileScreen";

export default function ProfileRoute() {
  const params = useLocalSearchParams<{ username?: string }>();
  const username = typeof params.username === "string" ? params.username.trim().toLowerCase() : "";
  if (!username) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <StateSurface kind="error" title="Invalid profile" message="Profile username is missing." />
      </View>
    );
  }
  return <ProfileScreen username={username} />;
}
