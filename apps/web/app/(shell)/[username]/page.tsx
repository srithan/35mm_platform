import type { Metadata } from "next";
import { ProfilePageClient } from "@/features/profile/components/ProfilePageClient";
import { fetchPublicProfile } from "@/features/profile/api/profileApi";

const PROFILE_H_INSET = "px-0 sm:px-0 md:px-0";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await fetchPublicProfile(username);
    if (!profile) return {};
    const displayName = profile.displayName;
    const title = `${displayName} (@${username})`;
    const description =
      profile.bio || `${displayName}'s filmmaker profile on 35mm.in — films, reviews, and activity.`;

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

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  return (
    <div className={"min-h-screen w-full box-border " + PROFILE_H_INSET}>
      <ProfilePageClient username={username.toLowerCase()} />
    </div>
  );
}
