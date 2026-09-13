export const chatKeys = {
  all: ["chat"] as const,
  inbox: (archived: boolean) => [...chatKeys.all, "inbox", { archived }] as const,
  messages: (threadId: string) => [...chatKeys.all, "messages", threadId] as const,
  typing: (threadId: string) => [...chatKeys.all, "typing", threadId] as const,
  receipts: (threadId: string) => [...chatKeys.all, "receipts", threadId] as const,
  presence: (userIds: readonly string[]) => [...chatKeys.all, "presence", [...userIds].sort()] as const,
  contacts: (query: string) => [...chatKeys.all, "contacts", query.trim().toLowerCase()] as const,
};
