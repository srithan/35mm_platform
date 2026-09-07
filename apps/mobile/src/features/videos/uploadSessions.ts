import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "35mm:video-upload-sessions:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const MAX_SESSIONS = 20;

export interface StoredVideoUploadSession {
  readonly fingerprint: string;
  readonly idempotencyKey: string;
  readonly uploadUrl: string | null;
  readonly createdAt: number;
}

function parseSession(value: unknown): StoredVideoUploadSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (
    typeof source.fingerprint !== "string" ||
    typeof source.idempotencyKey !== "string" ||
    (source.uploadUrl !== null && typeof source.uploadUrl !== "string") ||
    typeof source.createdAt !== "number" ||
    !Number.isFinite(source.createdAt)
  ) return null;
  return {
    fingerprint: source.fingerprint,
    idempotencyKey: source.idempotencyKey,
    uploadUrl: source.uploadUrl,
    createdAt: source.createdAt,
  };
}

async function readSessions(now = Date.now()): Promise<StoredVideoUploadSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const decoded: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(decoded)) return [];
    return decoded
      .map(parseSession)
      .filter((item): item is StoredVideoUploadSession =>
        item !== null && item.createdAt > now - MAX_AGE_MS,
      )
      .slice(-MAX_SESSIONS);
  } catch {
    throw new Error("Video upload recovery storage is unavailable.");
  }
}

async function writeSessions(sessions: readonly StoredVideoUploadSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
  } catch {
    throw new Error("Video upload recovery could not be saved.");
  }
}

export async function findVideoUploadSession(
  fingerprint: string,
): Promise<StoredVideoUploadSession | null> {
  return (await readSessions()).find((item) => item.fingerprint === fingerprint) ?? null;
}

export async function saveVideoUploadSession(
  session: StoredVideoUploadSession,
): Promise<void> {
  const current = await readSessions();
  await writeSessions([
    ...current.filter((item) => item.fingerprint !== session.fingerprint),
    session,
  ]);
}

export async function removeVideoUploadSession(fingerprint: string): Promise<void> {
  const current = await readSessions();
  await writeSessions(current.filter((item) => item.fingerprint !== fingerprint));
}
