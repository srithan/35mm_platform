import type { Metadata } from "next";
import { generateProfileMetadata } from "@/features/profile/lib/profileMetadata";

interface ProfileDiaryPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileDiaryPageProps): Promise<Metadata> {
  const { username } = await params;
  return generateProfileMetadata(username, "diary");
}

export default function ProfileDiaryPage() {
  return null;
}
