import type { Metadata } from "next";
import { QuotesPageContent } from "@/features/feed/components/QuotesPageContent";

interface QuotesPageProps {
  params: Promise<{ username: string; postid: string }>;
}

export async function generateMetadata({ params }: QuotesPageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `Quotes of @${username}'s post`,
    description: `See how people quoted @${username}'s post on 35mm.`,
  };
}

export default async function QuotesPage({ params }: QuotesPageProps) {
  const { username, postid } = await params;
  return <QuotesPageContent username={username} postId={postid} />;
}
