import type { Metadata } from "next";
import { NewPostPage } from "@/features/feed/components/NewPostPage";

export const metadata: Metadata = {
  title: "New post",
  description: "Write and publish a post on 35mm.",
  openGraph: {
    title: "New post",
    description: "Write and publish a post on 35mm.",
  },
};

export default function NewPostRoute() {
  return <NewPostPage />;
}
