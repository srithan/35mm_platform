import type { Metadata } from "next";
import { PostComposer } from "@/features/feed/components/PostComposer";
import { InfinitePostList } from "@/features/feed/components/InfinitePostList";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Your feed. Films, reviews, and updates from filmmakers you follow.",
  openGraph: {
    title: "Home",
    description:
      "Your feed. Films, reviews, and updates from filmmakers you follow.",
  },
};

export default function HomePage() {
  return (
    <>
      <PostComposer />
      <InfinitePostList />
    </>
  );
}
