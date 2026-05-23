function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) {
    return "Today";
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (isSameDay(d, y)) {
    return "Yesterday";
  }
  if (d.getFullYear() !== now.getFullYear()) {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** List row preview time — short relative. */
export function formatRelativeShort(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 45) {
    return "now";
  }
  if (sec < 3600) {
    return Math.floor(sec / 60) + "m";
  }
  if (sec < 86400) {
    return Math.floor(sec / 3600) + "h";
  }
  const d = new Date(date);
  const now = new Date();
  if (isSameDay(d, now)) {
    return formatMessageTime(date.toISOString());
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (isSameDay(d, y)) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function shouldShowDaySeparator(prevIso: string | null, currIso: string): boolean {
  if (!prevIso) {
    return true;
  }
  return !isSameDay(new Date(prevIso), new Date(currIso));
}
