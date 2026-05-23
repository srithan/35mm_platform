import type { Metadata } from "next";
import { Suspense } from "react";
import { CoverPhoto } from "@/features/profile/components/CoverPhoto";
import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { ProfileBody } from "@/features/profile/components/ProfileBody";
import { ProfileScrollChrome } from "@/features/profile/components/ProfileScrollChrome";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { getMockPortraitUrlForUsername } from "@/lib/constants/mockPortraitUrl";

const PROFILE_DISPLAY_NAMES: Record<string, string> = {
  srithan: "Srithan",
  maya: "Maya Okonkwo",
};

/** Mini header subtitle (matches reference headline line brevity). */
const PROFILE_MINI_TAGLINE = "Cinematographer & director";

/** One horizontal inset for hero + timeline (avoid stacking with ShellGrid `xl:px-6`). */
const PROFILE_H_INSET = "px-0 sm:px-0 md:px-0";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const displayName =
    PROFILE_DISPLAY_NAMES[username] ?? username.charAt(0).toUpperCase() + username.slice(1);
  const title = `${displayName} (@${username})`;
  const description = `${displayName}'s filmmaker profile on 35mm.in — films, reviews, and activity.`;

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
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const displayName =
    PROFILE_DISPLAY_NAMES[username] ?? username.charAt(0).toUpperCase() + username.slice(1);

  const miniAvatarUrl = getMockPortraitUrlForUsername(username);

  var coverEl = (
    <CoverPhoto isOwnProfile={username === CURRENT_USER.username} />
  );

  return (
    <div className={"min-h-screen w-full box-border " + PROFILE_H_INSET}>
      <ProfileScrollChrome
        displayName={displayName}
        tagline={PROFILE_MINI_TAGLINE}
        avatarUrl={miniAvatarUrl}
        cover={coverEl}
      >
        <ProfileHeader
          username={username}
          displayName={displayName}
          bio="Cinematographer & director. Shooting on film whenever possible. Ashes and Embers (2025) · Sundance alumna · Lagos → London → wherever the light is good."
          isOwnProfile={username === CURRENT_USER.username}
        />
      </ProfileScrollChrome>
      <Suspense fallback={<div className="mt-12 min-h-[120px]" />}>
        <ProfileBody username={username} displayName={displayName} />
      </Suspense>
    </div>
  );
}
