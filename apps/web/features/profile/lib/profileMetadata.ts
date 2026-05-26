import type { Metadata } from "next";
import { fetchPublicProfile } from "@/features/profile/api/profileApi";
import { profileTabLabel, type ProfileTab } from "./profileRoutes";

export async function generateProfileMetadata(
  username: string,
  tab: ProfileTab = "posts"
): Promise<Metadata> {
  var normalizedUsername = username.toLowerCase();

  try {
    var profile = await fetchPublicProfile(normalizedUsername);
    if (!profile) return {};

    var displayName = profile.displayName;
    var tabSuffix = tab === "posts" ? "" : ` · ${profileTabLabel(tab)}`;
    var title = `${displayName} (@${normalizedUsername})${tabSuffix}`;
    var description =
      profile.bio ||
      `${displayName}'s filmmaker profile on 35mm.in — films, reviews, and activity.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
      },
      twitter: {
        title,
        description,
      },
    };
  } catch {
    return {};
  }
}
