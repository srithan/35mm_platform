import { NewChatProvider } from "@/features/chat/context/NewChatContext";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NewChatProvider>{children}</NewChatProvider>;
}
