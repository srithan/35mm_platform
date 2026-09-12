const URL_SLUG_RE = /^[\p{Letter}\p{Number}\p{Mark}]+(?:-[\p{Letter}\p{Number}\p{Mark}]+)*$/u;

export function toUrlSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}\p{Mark}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  const slug = Array.from(normalized)
    .slice(0, 200)
    .join("")
    .replace(/-+$/g, "");
  return slug || "untitled";
}

export function isUrlSlug(value: string): boolean {
  return (
    value === value.toLowerCase() &&
    Array.from(value).length <= 200 &&
    URL_SLUG_RE.test(value)
  );
}
