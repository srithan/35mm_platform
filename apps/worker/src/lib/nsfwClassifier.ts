import type { NsfwCategory } from "@35mm/types";
import { loadWorkerEnv } from "./env.js";
import { getWorkerR2ObjectBytes } from "./r2.js";

var NSFW_CATEGORIES = new Set<NsfwCategory>([
  "nudity",
  "sexual_content",
  "violence",
  "graphic_content",
  "sensitive",
]);

function classifierConfig(): { url: string; token: string | null; timeoutMs: number } {
  var url = process.env.NSFW_CLASSIFIER_URL?.trim() ?? "";
  if (!url) {
    throw new Error("NSFW classifier is unavailable: NSFW_CLASSIFIER_URL is not configured");
  }
  var configuredTimeout = Number(process.env.NSFW_CLASSIFIER_TIMEOUT_MS ?? 15_000);
  return {
    url,
    token: process.env.NSFW_CLASSIFIER_TOKEN?.trim() || null,
    timeoutMs: Number.isFinite(configuredTimeout)
      ? Math.max(1_000, Math.min(Math.floor(configuredTimeout), 60_000))
      : 15_000,
  };
}

function parseCategories(value: unknown): NsfwCategory[] {
  if (!value || typeof value !== "object") {
    throw new Error("NSFW classifier returned an invalid response");
  }
  var categories = (value as { categories?: unknown }).categories;
  if (!Array.isArray(categories)) {
    throw new Error("NSFW classifier response is missing categories");
  }
  var out: NsfwCategory[] = [];
  var seen = new Set<NsfwCategory>();
  for (var category of categories) {
    if (!NSFW_CATEGORIES.has(category as NsfwCategory)) {
      throw new Error("NSFW classifier returned an unsupported category");
    }
    if (!seen.has(category as NsfwCategory)) {
      seen.add(category as NsfwCategory);
      out.push(category as NsfwCategory);
    }
  }
  return out;
}

async function requestClassification(body: BodyInit, contentType: string): Promise<NsfwCategory[]> {
  var config = classifierConfig();
  var controller = new AbortController();
  var timeout = setTimeout(function () {
    controller.abort();
  }, config.timeoutMs);
  try {
    var response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        ...(config.token ? { Authorization: "Bearer " + config.token } : {}),
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("NSFW classifier request failed with status " + response.status);
    }
    return parseCategories(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

export async function classifyText(text: string): Promise<NsfwCategory[]> {
  return requestClassification(
    JSON.stringify({ type: "text", text }),
    "application/json"
  );
}

export async function classifyImage(objectKey: string): Promise<NsfwCategory[]> {
  var bytes = await getWorkerR2ObjectBytes(loadWorkerEnv(), objectKey);
  var imageBytes = Uint8Array.from(bytes);
  var form = new FormData();
  form.set("type", "image");
  form.set("objectKey", objectKey);
  form.set("image", new Blob([imageBytes.buffer]), objectKey.split("/").pop() || "image");

  var config = classifierConfig();
  var controller = new AbortController();
  var timeout = setTimeout(function () {
    controller.abort();
  }, config.timeoutMs);
  try {
    var response = await fetch(config.url, {
      method: "POST",
      headers: config.token ? { Authorization: "Bearer " + config.token } : undefined,
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("NSFW classifier request failed with status " + response.status);
    }
    return parseCategories(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}
