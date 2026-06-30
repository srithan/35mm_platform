import type { ChatMessage } from "../types";

/** Stable ascending order for thread rendering (oldest → newest). */
export function sortChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice().sort(function (a, b) {
    var ta = new Date(a.createdAt).getTime();
    var tb = new Date(b.createdAt).getTime();
    if (ta !== tb) {
      return ta - tb;
    }
    return a.id.localeCompare(b.id);
  });
}

export function upsertChatMessageSorted(
  list: ChatMessage[],
  message: ChatMessage
): ChatMessage[] {
  var idx = list.findIndex(function (m) {
    return m.id === message.id;
  });
  var next = list.slice();
  if (idx !== -1) {
    next[idx] = message;
  } else {
    next.push(message);
  }
  return sortChatMessages(next);
}
