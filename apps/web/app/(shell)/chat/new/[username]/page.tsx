import type { Metadata } from "next";
import { ProfileMessageDraft } from "@/features/chat/components/ProfileMessageDraft";

export const metadata: Metadata = {
  title: "New message",
  description: "Start a private conversation on 35mm.",
  robots: { index: false, follow: false },
};

export default async function ProfileMessagePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <ProfileMessageDraft username={username.toLowerCase()} />;
}
