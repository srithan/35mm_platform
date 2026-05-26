import { loadEnv } from "../../lib/env.js";

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function encodeCustomIdPath(value: string): string {
  return trimSlashes(value)
    .split("/")
    .map(function (segment) {
      return encodeURIComponent(segment);
    })
    .join("/");
}

export function getCfImagesDeliveryBaseUrl(): string | null {
  var env = loadEnv();
  if (env.CF_IMAGES_DELIVERY_BASE_URL && env.CF_IMAGES_DELIVERY_BASE_URL.trim().length > 0) {
    return env.CF_IMAGES_DELIVERY_BASE_URL.trim().replace(/\/+$/, "");
  }
  if (!env.CF_IMAGES_ACCOUNT_HASH) return null;
  return "https://imagedelivery.net/" + env.CF_IMAGES_ACCOUNT_HASH.trim();
}

export function buildCfImagesVariantUrl(imageId: string, variantId: string): string | null {
  var baseUrl = getCfImagesDeliveryBaseUrl();
  if (!baseUrl) return null;
  return baseUrl + "/" + encodeCustomIdPath(imageId) + "/" + trimSlashes(variantId);
}
