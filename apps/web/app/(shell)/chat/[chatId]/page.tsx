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
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams?: Promise<{
    source?: string | string[];
    hasExistingMessages?: string | string[];
  }>;
}) {
  const { chatId } = await params;
  const qs = (await searchParams) ?? {};
  const source = Array.isArray(qs.source) ? qs.source[0] : qs.source;
  const hasExistingMessages = Array.isArray(qs.hasExistingMessages)
    ? qs.hasExistingMessages[0]
    : qs.hasExistingMessages;
  const urlChatId = chatId.toLowerCase();
  if (chatId !== urlChatId) {
    redirect("/chat/" + encodeURIComponent(urlChatId));
  }
  return (
    <ChatDetailPage
      chatId={chatId.toUpperCase()}
      discardDraftIfNoMessages={
        source === "profile-message" && hasExistingMessages === "0"
      }
    />
  );
}
