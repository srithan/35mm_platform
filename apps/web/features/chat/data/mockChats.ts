import type { ChatPreview } from "../types";

export type { ChatPreview } from "../types";

/** Seed metadata; list previews are synced from thread tails in `chatStore` on load. */
export const MOCK_CHATS: ChatPreview[] = [
  {
    id: "1",
    name: "Maya Okonkwo",
    username: "maya.film",
    lastMessage: "",
    lastMessageAt: "",
    unread: 2,
    avatarBg: "#2a1e30",
    avatarColor: "#9a7ab0",
  },
  {
    id: "2",
    name: "Kati Szabó",
    username: "k.szabo",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#2d3a4a",
    avatarColor: "#7a9eb0",
  },
  {
    id: "3",
    name: "Norah Dop",
    username: "nora.dop",
    lastMessage: "",
    lastMessageAt: "",
    unread: 1,
    avatarBg: "#1e2a1a",
    avatarColor: "#7a9e6a",
  },
  {
    id: "4",
    name: "Tema Osei",
    username: "t.osei",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#2d2a1e",
    avatarColor: "#9e9a6a",
  },
  {
    id: "5",
    name: "Luca Ferri",
    username: "luca.grade",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#1a2438",
    avatarColor: "#c9a227",
  },
  {
    id: "6",
    name: "Aisha Rahman",
    username: "aishar",
    lastMessage: "",
    lastMessageAt: "",
    unread: 3,
    avatarBg: "#301818",
    avatarColor: "#e8a0a0",
  },
  {
    id: "7",
    name: "Neon Desk",
    username: "neon.desk",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#0d1f1a",
    avatarColor: "#5eead4",
  },
  {
    id: "8",
    name: "James Wright",
    username: "jw_dp",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#252016",
    avatarColor: "#d4a574",
  },
  {
    id: "9",
    name: "Sienna Cole",
    username: "sienna.cut",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#221828",
    avatarColor: "#b794f6",
  },
  {
    id: "10",
    name: "Folko Bergmann",
    username: "folko.b",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#1e1e28",
    avatarColor: "#94a3b8",
  },
  {
    id: "11",
    name: "Rae Park",
    username: "rae.sound",
    lastMessage: "",
    lastMessageAt: "",
    unread: 0,
    avatarBg: "#14201c",
    avatarColor: "#6ee7b7",
  },
  {
    id: "12",
    name: "Marisol Vega",
    username: "m.vega.stills",
    lastMessage: "",
    lastMessageAt: "",
    unread: 1,
    avatarBg: "#2a1810",
    avatarColor: "#fb923c",
    isPendingRequest: true,
  },
];

export const CHAT_AVATARS: Record<string, { bg: string; color: string }> = {
  "1": { bg: "#2a1e30", color: "#9a7ab0" },
  "2": { bg: "#2d3a4a", color: "#7a9eb0" },
  "3": { bg: "#1e2a1a", color: "#7a9e6a" },
  "4": { bg: "#2d2a1e", color: "#9e9a6a" },
  "5": { bg: "#1a2438", color: "#c9a227" },
  "6": { bg: "#301818", color: "#e8a0a0" },
  "7": { bg: "#0d1f1a", color: "#5eead4" },
  "8": { bg: "#252016", color: "#d4a574" },
  "9": { bg: "#221828", color: "#b794f6" },
  "10": { bg: "#1e1e28", color: "#94a3b8" },
  "11": { bg: "#14201c", color: "#6ee7b7" },
  "12": { bg: "#2a1810", color: "#fb923c" },
};

export function getChatById(id: string): ChatPreview | null {
  return (
    MOCK_CHATS.find(function (c) {
      return c.id === id;
    }) ?? null
  );
}
