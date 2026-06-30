export function getMessageBucket(date: Date): number {
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}

export function getBucketRange(now: Date): [number, number] {
  var end = getMessageBucket(now);
  var cursor = new Date(now);
  cursor.setUTCMonth(cursor.getUTCMonth() - 11);
  return [getMessageBucket(cursor), end];
}

export function bucketsNewestFirst(now: Date): number[] {
  var buckets: number[] = [];
  var cursor = new Date(now);
  for (var i = 0; i < 12; i += 1) {
    buckets.push(getMessageBucket(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return buckets;
}

export function truncatePreview(body: string | null, contentType: string): string {
  if (!body) {
    if (contentType === "image") return "📷 Photo";
    if (contentType === "gif") return "GIF";
    if (contentType === "file") return "📎 File";
    if (contentType === "link") return "🔗 Link";
    return "";
  }
  return body.length >= 200 ? body.slice(0, 199) + "…" : body;
}
