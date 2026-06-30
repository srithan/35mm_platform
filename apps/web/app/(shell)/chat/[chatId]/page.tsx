import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatDetailPage } from "@/features/chat/components/ChatDetailPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chatId: string }>;
}): Promise<Metadata> {
  await params;
  return {
    title: "Messages",
    description: "Private conversations on 35mm.",
    robots: { index: false, follow: false },
  };
}

export default async function ChatIdPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const urlChatId = chatId.toLowerCase();
  if (chatId !== urlChatId) {
    redirect("/chat/" + encodeURIComponent(urlChatId));
  }
  return <ChatDetailPage chatId={chatId.toUpperCase()} />;
}
