import type { Metadata } from "next";
import { ChatIndexRoute } from "@/features/chat";

export const metadata: Metadata = {
  title: "Messages",
  description: "Private conversations with filmmakers on 35mm.",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return <ChatIndexRoute />;
}
