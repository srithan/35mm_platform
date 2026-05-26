import type { Metadata } from "next";
import { generateProfileMetadata } from "@/features/profile/lib/profileMetadata";

interface ProfileStatsPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileStatsPageProps): Promise<Metadata> {
  const { username } = await params;
  return generateProfileMetadata(username, "stats");
}

export default function ProfileStatsPage() {
  return null;
}
