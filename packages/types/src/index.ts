export type UserId = string;
export type PostId = string;
export type ConversationId = string;
export type MessageId = string;

export interface PublicUser {
  id: UserId;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface FeedPost {
  id: PostId;
  author: PublicUser;
  body: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
}

export interface FeedPage {
  items: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ChatPreview {
  id: ConversationId;
  name: string;
  username: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export interface ChatMessage {
  id: MessageId;
  conversationId: ConversationId;
  sender: PublicUser;
  text: string;
  createdAt: string;
}

export interface HealthResponse {
  ok: true;
  service: string;
  version: string;
}
