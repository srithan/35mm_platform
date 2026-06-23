const loadedAvatarUrls = new Set<string>();
const preloadingAvatarUrls = new Set<string>();

function normalizeAvatarUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isAvatarImageLoaded(value: string | null | undefined): boolean {
  const url = normalizeAvatarUrl(value);
  return url ? loadedAvatarUrls.has(url) : false;
}

export function markAvatarImageLoaded(value: string | null | undefined): void {
  const url = normalizeAvatarUrl(value);
  if (url) loadedAvatarUrls.add(url);
}

export function preloadAvatarImageUrl(value: string | null | undefined): void {
  const url = normalizeAvatarUrl(value);
  if (!url || preloadingAvatarUrls.has(url) || isAvatarImageLoaded(url)) return;
  if (typeof document === "undefined" || typeof window === "undefined") return;

  preloadingAvatarUrls.add(url);

  const existingLink = Array.from(document.head.querySelectorAll<HTMLLinkElement>(
    'link[rel="preload"][as="image"]'
  )).some(function (link) {
    return link.href === url || link.getAttribute("href") === url;
  });
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);
  }

  const image = new window.Image();
  image.decoding = "async";
  image.onload = function () {
    markAvatarImageLoaded(url);
  };
  image.onerror = function () {
    preloadingAvatarUrls.delete(url);
  };
  image.src = url;
  if (image.complete && image.naturalWidth > 0) {
    markAvatarImageLoaded(url);
  }
}
