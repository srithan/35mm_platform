import Constants from "expo-constants";

export interface MobileRuntimeConfig {
  readonly apiBaseUrl: string;
  readonly appVariant: "development" | "preview";
  readonly appVersion: string;
  readonly clerkPublishableKey: string;
}

export interface MobileRuntimeConfigInput {
  readonly apiBaseUrl: string | undefined;
  readonly appVariant: unknown;
  readonly appVersion: string | undefined;
  readonly clerkPublishableKey: string | undefined;
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Missing required mobile configuration: ${name}.`);
  return normalized;
}

function parseAppVariant(value: unknown): MobileRuntimeConfig["appVariant"] {
  if (value === "development" || value === "preview") return value;
  throw new Error("Mobile app variant must be development or preview.");
}

function isValidClerkPublishableKey(value: string): boolean {
  const match = value.match(/^pk_(test|live)_([A-Za-z0-9_-]+)$/);
  if (!match?.[2]) return false;
  try {
    const encoded = match[2].replace(/-/g, "+").replace(/_/g, "/");
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const decoded = globalThis.atob(padded);
    return decoded.endsWith("$") && /^[A-Za-z0-9.-]+\$$/.test(decoded);
  } catch {
    return false;
  }
}

export function parseMobileRuntimeConfig(input: MobileRuntimeConfigInput): MobileRuntimeConfig {
  const variant = parseAppVariant(input.appVariant);
  const apiBaseUrl = required(input.apiBaseUrl, "EXPO_PUBLIC_API_URL").replace(/\/$/, "");
  const clerkPublishableKey = required(
    input.clerkPublishableKey,
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  );
  const appVersion = required(input.appVersion, "app version");

  let apiUrl: URL;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL must be an absolute HTTP(S) URL.");
  }
  if (apiUrl.protocol !== "https:" && apiUrl.protocol !== "http:") {
    throw new Error("EXPO_PUBLIC_API_URL must use HTTP or HTTPS.");
  }
  if (apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
    throw new Error("EXPO_PUBLIC_API_URL cannot contain credentials, query, or fragment.");
  }
  const isLoopback =
    apiUrl.hostname === "localhost" ||
    apiUrl.hostname === "127.0.0.1" ||
    apiUrl.hostname === "::1";
  if (variant === "preview" && (apiUrl.protocol !== "https:" || isLoopback)) {
    throw new Error("Preview API URL must use HTTPS and cannot target loopback.");
  }
  if (!isValidClerkPublishableKey(clerkPublishableKey)) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is invalid.");
  }

  return { apiBaseUrl, appVariant: variant, appVersion, clerkPublishableKey };
}

export function getMobileRuntimeConfig(): MobileRuntimeConfig {
  return parseMobileRuntimeConfig({
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
    clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    appVariant: Constants.expoConfig?.extra?.appVariant,
    appVersion: Constants.expoConfig?.version,
  });
}
