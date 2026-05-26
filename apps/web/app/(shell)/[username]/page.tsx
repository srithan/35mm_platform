import type { Metadata } from "next";
import { generateProfileMetadata } from "@/features/profile/lib/profileMetadata";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return generateProfileMetadata(username, "posts");
}

export default function ProfilePage() {
  return null;
}
