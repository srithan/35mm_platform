import type { Metadata } from "next";
import { generateProfileMetadata } from "@/features/profile/lib/profileMetadata";

interface ProfileListsPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileListsPageProps): Promise<Metadata> {
  const { username } = await params;
  return generateProfileMetadata(username, "lists");
}

export default function ProfileListsPage() {
  return null;
}
