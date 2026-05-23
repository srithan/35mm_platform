import type { Metadata } from "next";
import { PostDetailView } from "@/features/feed/components/PostDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; postid: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const title = `${username}'s Post`;
  const description = `Post by @${username} on 35mm.in — a social network for filmmakers.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ username: string; postid: string }>;
}) {
  const { username, postid } = await params;

  return (
    <PostDetailView username={username} postId={postid} />
  );
}
