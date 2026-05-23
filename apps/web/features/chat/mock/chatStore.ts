"use client";

import type {
  ChatMessage,
  ChatMessageReaction,
  ChatPreview,
  ChatSendPayload,
} from "../types";
import { MOCK_CHATS } from "../data/mockChats";
import { formatRelativeShort } from "../lib/formatChatTime";
import {
  SEED_THREADS,
  type SeedMessageRow,
} from "./seedChatThreads";

function delay(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function truncateSnippet(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return t.slice(0, max - 1) + "…";
}

function previewForList(m: ChatMessage): string {
  if (m.media && m.media.type === "gif") {
    return m.text.trim() ? m.text.trim() : "GIF";
  }
  if (m.media && m.media.type === "image") {
    return m.text.trim() ? m.text.trim() : "Photo";
  }
  if (m.file) {
    return m.text.trim() ? m.text.trim() : "📎 " + m.file.name;
  }
  return m.text.trim();
}

function applyToggleReaction(
  reactions: ChatMessageReaction[] | undefined,
  emoji: string
): ChatMessageReaction[] {
  const list: ChatMessageReaction[] = reactions
    ? reactions.map(function (r) {
        return { emoji: r.emoji, count: r.count, includesMe: r.includesMe };
      })
    : [];
  let existingMine = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].includesMe) {
      existingMine = i;
      break;
    }
  }
  if (existingMine !== -1) {
    const existing = list[existingMine];
    if (existing.emoji === emoji) {
      const c = existing.count - 1;
      if (c <= 0) {
        list.splice(existingMine, 1);
      } else {
        list[existingMine] = {
          emoji: existing.emoji,
          count: c,
          includesMe: false,
        };
      }
      return list;
    }
    const c = existing.count - 1;
    if (c <= 0) {
      list.splice(existingMine, 1);
    } else {
      list[existingMine] = {
        emoji: existing.emoji,
        count: c,
        includesMe: false,
      };
    }
  }
  let row = -1;
  for (let j = 0; j < list.length; j++) {
    if (list[j].emoji === emoji) {
      row = j;
      break;
    }
  }
  if (row === -1) {
    list.push({ emoji: emoji, count: 1, includesMe: true });
  } else {
    list[row] = {
      emoji: list[row].emoji,
      count: list[row].count + 1,
      includesMe: true,
    };
  }
  return list;
}

let conversations: ChatPreview[] = clone(MOCK_CHATS);
const messagesByChat: Record<string, ChatMessage[]> = {};

function seedRowToMessage(chatId: string, row: SeedMessageRow): ChatMessage {
  const msg: ChatMessage = {
    id: row.id,
    chatId: chatId,
    text: row.text,
    isOwn: row.isOwn,
    createdAt: row.createdAt,
    status: row.isOwn ? "read" : undefined,
    reactions: row.reactions
      ? row.reactions.map(function (r) {
          return {
            emoji: r.emoji,
            count: r.count,
            includesMe: r.includesMe,
          };
        })
      : [],
  };
  if (row.media) {
    msg.media = { type: row.media.type, url: row.media.url };
  }
  if (row.file) {
    msg.file = {
      name: row.file.name,
      sizeLabel: row.file.sizeLabel,
    };
  }
  if (row.replyTo) {
    msg.replyTo = {
      id: row.replyTo.id,
      snippet: row.replyTo.snippet,
      isOwn: row.replyTo.isOwn,
    };
  }
  return msg;
}

function seedMessages(): void {
  const ids = Object.keys(SEED_THREADS);
  for (let i = 0; i < ids.length; i++) {
    const chatId = ids[i];
    const rows = SEED_THREADS[chatId];
    messagesByChat[chatId] = rows.map(function (row) {
      return seedRowToMessage(chatId, row);
    });
  }
}

/** Align sidebar previews + times with the last message in each seeded thread. */
function syncConversationPreviewsFromThreads(): void {
  for (let j = 0; j < conversations.length; j++) {
    const id = conversations[j].id;
    const thread = messagesByChat[id];
    if (!thread || thread.length === 0) {
      continue;
    }
    const last = thread[thread.length - 1];
    conversations[j].lastMessage = previewForList(last);
    conversations[j].lastMessageAt = formatRelativeShort(new Date(last.createdAt));
  }
}

seedMessages();
syncConversationPreviewsFromThreads();

export async function mockFetchConversations(): Promise<ChatPreview[]> {
  await delay(140 + Math.floor(Math.random() * 100));
  return clone(conversations);
}

export async function mockFetchMessages(chatId: string): Promise<ChatMessage[]> {
  await delay(90 + Math.floor(Math.random() * 90));
  return clone(messagesByChat[chatId] ?? []);
}

export async function mockSendMessage(
  chatId: string,
  payload: ChatSendPayload
): Promise<ChatMessage> {
  await delay(200 + Math.floor(Math.random() * 160));
  const text = (payload.text || "").trim();
  const hasGif = Boolean(payload.gifUrl);
  const hasImage = Boolean(payload.imageDataUrl);
  const hasFile = Boolean(payload.file);

  if (!text && !hasGif && !hasImage && !hasFile) {
    throw new Error("Empty message");
  }

  const msg: ChatMessage = {
    id:
      "m-" +
      String(Date.now()) +
      "-" +
      Math.random().toString(36).slice(2, 8),
    chatId: chatId,
    text: text,
    isOwn: true,
    createdAt: new Date().toISOString(),
    status: "delivered",
    reactions: [],
  };

  if (payload.gifUrl) {
    msg.media = { type: "gif", url: payload.gifUrl };
  } else if (payload.imageDataUrl) {
    msg.media = { type: "image", url: payload.imageDataUrl };
  }

  if (payload.file) {
    msg.file = {
      name: payload.file.name,
      sizeLabel: payload.file.sizeLabel,
    };
  }

  const thread = messagesByChat[chatId];
  if (payload.replyToId && thread) {
    let parent: ChatMessage | undefined;
    for (let k = 0; k < thread.length; k++) {
      if (thread[k].id === payload.replyToId) {
        parent = thread[k];
        break;
      }
    }
    if (parent) {
      let snippet = parent.text.trim();
      if (!snippet) {
        if (parent.media && parent.media.type === "gif") {
          snippet = "GIF";
        } else if (parent.media && parent.media.type === "image") {
          snippet = "Photo";
        } else if (parent.file) {
          snippet = parent.file.name;
        } else {
          snippet = "Message";
        }
      }
      msg.replyTo = {
        id: parent.id,
        snippet: truncateSnippet(snippet, 100),
        isOwn: parent.isOwn,
      };
    }
  }

  if (!messagesByChat[chatId]) {
    messagesByChat[chatId] = [];
  }
  messagesByChat[chatId].push(msg);

  const preview = previewForList(msg);
  for (let j = 0; j < conversations.length; j++) {
    if (conversations[j].id === chatId) {
      conversations[j].lastMessage = preview;
      conversations[j].lastMessageAt = formatRelativeShort(new Date(msg.createdAt));
      conversations[j].unread = 0;
      break;
    }
  }
  return clone(msg);
}

export async function mockMarkConversationRead(chatId: string): Promise<void> {
  await delay(30);
  for (let j = 0; j < conversations.length; j++) {
    if (conversations[j].id === chatId) {
      conversations[j].unread = 0;
      break;
    }
  }
}

export async function mockSetConversationArchived(
  chatId: string,
  archived: boolean
): Promise<void> {
  await delay(90);
  for (let j = 0; j < conversations.length; j++) {
    if (conversations[j].id === chatId) {
      conversations[j].archived = archived;
      break;
    }
  }
}

export async function mockToggleReaction(
  chatId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  await delay(45);
  const list = messagesByChat[chatId];
  if (!list) {
    return;
  }
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === messageId) {
      list[i].reactions = applyToggleReaction(list[i].reactions, emoji);
      break;
    }
  }
}

export async function mockDeleteConversation(chatId: string): Promise<void> {
  await delay(120);
  conversations = conversations.filter(function (c) {
    return c.id !== chatId;
  });
  delete messagesByChat[chatId];
}

export async function mockDeleteMessage(
  chatId: string,
  messageId: string
): Promise<void> {
  await delay(80);
  const list = messagesByChat[chatId];
  if (!list) {
    return;
  }
  const idx = list.findIndex(function (m) {
    return m.id === messageId;
  });
  if (idx === -1) {
    return;
  }
  if (!list[idx].isOwn) {
    return;
  }
  list.splice(idx, 1);
  const last = list[list.length - 1];
  for (let j = 0; j < conversations.length; j++) {
    if (conversations[j].id === chatId) {
      if (last) {
        conversations[j].lastMessage = previewForList(last);
        conversations[j].lastMessageAt = formatRelativeShort(
          new Date(last.createdAt)
        );
      } else {
        conversations[j].lastMessage = "";
        conversations[j].lastMessageAt = "";
      }
      break;
    }
  }
}
