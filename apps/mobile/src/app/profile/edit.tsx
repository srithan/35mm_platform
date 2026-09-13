import { StateSurface } from "@35mm/mobile-ui";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { EditProfileScreen } from "@/features/profile/EditProfileScreen";

export default function EditProfileRoute() {
  const params = useLocalSearchParams<{ username?: string }>();
  const username = typeof params.username === "string" ? params.username.trim().toLowerCase() : "";
  if (!username) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <StateSurface kind="error" title="Invalid edit profile route" message="Profile username is missing." />
      </View>
    );
  }
  return <EditProfileScreen username={username} />;
}
