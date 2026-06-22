import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChatById } from "@/features/chat/data/mockChats";
import { ChatDetailPage } from "@/features/chat/components/ChatDetailPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chatId: string }>;
}): Promise<Metadata> {
  const { chatId } = await params;
  const chat = getChatById(chatId);
  if (!chat) return { title: "Messages" };
  return {
    title: `${chat.name} — Messages`,
    description: `Chat with ${chat.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function ChatIdPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const chat = getChatById(chatId);

  if (!chat) notFound();

  return <ChatDetailPage chat={chat} />;
}
