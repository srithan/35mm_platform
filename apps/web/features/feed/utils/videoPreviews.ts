export type VideoProvider = "youtube" | "vimeo" | "dailymotion";

export interface VideoPreview {
  provider: VideoProvider;
  id: string;
  url: string;
  thumbnailUrl: string;
  label: string;
}

const URL_REGEX = /https?:\/\/[^\s]+/gi;

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id || null;
    }
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2];
      return id || null;
    }
  }
  return null;
}

function extractVimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
  const match = url.pathname.match(/\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

function extractDailymotionId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "dai.ly") {
    return url.pathname.slice(1).split("/")[0] || null;
  }
  if (host === "dailymotion.com") {
    const match = url.pathname.match(/\/video\/([^_/?]+)/);
    return match?.[1] ?? null;
  }
  return null;
}

function toVideoPreview(rawUrl: string): VideoPreview | null {
  try {
    const parsed = new URL(rawUrl);
    const youtubeId = extractYouTubeId(parsed);
    if (youtubeId) {
      return {
        provider: "youtube",
        id: youtubeId,
        url: rawUrl,
        thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        label: "YouTube",
      };
    }
    const vimeoId = extractVimeoId(parsed);
    if (vimeoId) {
      return {
        provider: "vimeo",
        id: vimeoId,
        url: rawUrl,
        thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
        label: "Vimeo",
      };
    }
    const dailymotionId = extractDailymotionId(parsed);
    if (dailymotionId) {
      return {
        provider: "dailymotion",
        id: dailymotionId,
        url: rawUrl,
        thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${dailymotionId}`,
        label: "Dailymotion",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function extractVideoPreviews(text: string): {
  cleanedText: string;
  previews: VideoPreview[];
} {
  const matches = text.match(URL_REGEX) ?? [];
  const previewMap = new Map<string, VideoPreview>();
  let cleaned = text;

  for (const match of matches) {
    const preview = toVideoPreview(match);
    if (!preview) continue;
    previewMap.set(preview.url, preview);
    cleaned = cleaned.split(match).join("");
  }

  const cleanedText = cleaned
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    cleanedText,
    previews: Array.from(previewMap.values()),
  };
}
