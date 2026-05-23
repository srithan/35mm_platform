"use client";

import { useState } from "react";

export function useMarkAllRead(initialUnreadIds: string[]) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const markAllRead = () => {
    setReadIds(new Set(initialUnreadIds));
  };

  const markRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  };

  const isRead = (id: string) => readIds.has(id);
  const allRead = initialUnreadIds.every((id) => readIds.has(id));
  const unreadCount = initialUnreadIds.filter((id) => !readIds.has(id)).length;

  return { markAllRead, markRead, isRead, allRead, unreadCount };
}
