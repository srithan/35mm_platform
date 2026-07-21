export type LinkPreviewPresentation = "card_only" | "url_and_card";

const HTTP_URL_PATTERN = /https?:\/\/[^\s]+/gi;
const TRAILING_URL_PUNCTUATION = /[),.!?;:]+$/;

function splitTrailingPunctuation(value: string): { url: string; suffix: string } {
  const suffix = value.match(TRAILING_URL_PUNCTUATION)?.[0] ?? "";
  return {
    url: suffix ? value.slice(0, -suffix.length) : value,
    suffix,
  };
}

function normalizedHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname === "") parsed.pathname = "/";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function urlsReferToSameResource(left: string, right: string): boolean {
  const normalizedLeft = normalizedHttpUrl(left);
  const normalizedRight = normalizedHttpUrl(right);
  return normalizedLeft !== null && normalizedLeft === normalizedRight;
}

export function extractFirstHttpUrl(value: string): string | null {
  HTTP_URL_PATTERN.lastIndex = 0;
  const match = HTTP_URL_PATTERN.exec(value);
  if (!match) return null;
  return splitTrailingPunctuation(match[0]).url;
}

function stripMatchingUrlFromLine(line: string, previewUrl: string): {
  text: string;
  removed: boolean;
} {
  let removed = false;
  HTTP_URL_PATTERN.lastIndex = 0;
  const text = line.replace(HTTP_URL_PATTERN, function (rawUrl) {
    const candidate = splitTrailingPunctuation(rawUrl);
    if (!urlsReferToSameResource(candidate.url, previewUrl)) return rawUrl;
    removed = true;
    return candidate.suffix;
  });

  return {
    text: text.replace(/[ \t]{2,}/g, " ").trimEnd(),
    removed,
  };
}

function isOnlyDiscardableUrlPunctuation(value: string): boolean {
  return /^[()[\],.!?;:]*$/.test(value.trim());
}

export function suppressLinkPreviewUrl(value: string, previewUrl: string): string {
  const visibleLines: string[] = [];
  let removedAny = false;
  value.split("\n").forEach(function (line) {
    const stripped = stripMatchingUrlFromLine(line, previewUrl);
    removedAny = removedAny || stripped.removed;
    if (stripped.removed && isOnlyDiscardableUrlPunctuation(stripped.text)) return;
    visibleLines.push(stripped.text);
  });

  if (!removedAny) return value;

  return visibleLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function inferLinkPreviewPresentation(
  bodyText: string,
  previewUrl: string
): LinkPreviewPresentation {
  const hasStandaloneUrl = bodyText.split("\n").some(function (line) {
    const stripped = stripMatchingUrlFromLine(line, previewUrl);
    return stripped.removed && isOnlyDiscardableUrlPunctuation(stripped.text);
  });
  return hasStandaloneUrl ? "card_only" : "url_and_card";
}
