export interface ChatParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ChatPreview {
  id: string;
  name: string;
  username: string;
  lastMessage: string;
  /** Short relative label for list row (e.g. 2m, 1h) */
  lastMessageAt: string;
  unread?: number;
  avatarUrl?: string | null;
  avatarBg: string;
  avatarColor: string;
  /** When true, chat appears under Archived instead of Inbox. */
  archived?: boolean;
  /** Message request — shown in Requests tab until accepted. */
  isPendingRequest?: boolean;
  /** Other participants for presence/read UI. DMs usually contain one item. */
  members?: ChatParticipant[];
}

export interface ChatMessageReplyRef {
  id: string;
  /** Truncated quote */
  snippet: string;
  isOwn: boolean;
}

export interface ChatMessageReaction {
  emoji: string;
  count: number;
  includesMe: boolean;
}

export interface ChatMessageMedia {
  type: "gif" | "image";
  url: string;
}

export interface ChatMessageFile {
  name: string;
  /** Human size e.g. "1.2 MB" */
  sizeLabel?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  text: string;
  isOwn: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** Simulated delivery state for sent bubbles */
  status?: "sending" | "sent" | "delivered" | "read";
  senderAvatarUrl?: string | null;
  editedAt?: string | null;
  replyTo?: ChatMessageReplyRef;
  reactions?: ChatMessageReaction[];
  media?: ChatMessageMedia;
  file?: ChatMessageFile;
}

export interface ChatSendPayload {
  text: string;
  replyToId?: string;
  gifUrl?: string;
  imageDataUrl?: string;
  file?: { name: string; sizeLabel?: string };
}
