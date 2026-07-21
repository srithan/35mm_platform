import type { Metadata } from "next";
import { generateProfileMetadata } from "@/features/profile/lib/profileMetadata";

interface ProfileRepostsPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileRepostsPageProps): Promise<Metadata> {
  const { username } = await params;
  return generateProfileMetadata(username, "reposts");
}

export default function ProfileRepostsPage() {
  return null;
}
