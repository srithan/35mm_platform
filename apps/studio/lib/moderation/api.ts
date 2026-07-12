import type {
  ModerationActionDto,
  ModerationContentDetailDto,
  ModerationContentType,
  ModerationQueuePage,
  ModerationReportReason,
  ModerationReportStatus,
} from '@35mm/types';
import type {
  ModerationActionPayloadInput,
  ModerationDismissPayloadInput,
} from '@35mm/validators';
import { PlatformApiError, platformRequest } from '@/lib/studio/platformClient';
import { randomUlid } from '@/lib/utils';

export { PlatformApiError as ModerationApiError };

export interface ModerationQueueFilters {
  status: ModerationReportStatus | null;
  contentType: ModerationContentType | null;
  reason: ModerationReportReason | null;
}

export interface ModerationDetailCursors {
  reportCursor?: string;
  actionCursor?: string;
  strikeCursor?: string;
  limit?: number;
}

function authTokenOrThrow(token: string | null): string {
  if (!token) {
    throw new PlatformApiError('Studio sign-in token missing', 401, 'UNAUTHORIZED');
  }
  return token;
}

/**
 * Fresh Idempotency-Key for a single moderation mutation attempt (8-120 chars).
 * Callers generate this once per attempt and reuse the SAME value when retrying
 * a `503 MODERATION_CACHE_SYNC_UNAVAILABLE` response.
 */
export function newModerationIdempotencyKey(action: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : randomUlid();
  return `studio:mod:${action}:${random}`;
}

export async function listModerationQueue(
  filters: ModerationQueueFilters,
  cursor: string | null,
  limit: number,
  token: string | null,
): Promise<ModerationQueuePage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters.status) params.set('status', filters.status);
  if (filters.contentType) params.set('contentType', filters.contentType);
  if (filters.reason) params.set('reason', filters.reason);
  if (cursor) params.set('cursor', cursor);

  return platformRequest<ModerationQueuePage>(`/v1/admin/moderation/queue?${params.toString()}`, {
    token: authTokenOrThrow(token),
  });
}

export async function getModerationContentDetail(
  contentType: ModerationContentType,
  contentId: string,
  cursors: ModerationDetailCursors,
  token: string | null,
): Promise<ModerationContentDetailDto> {
  const params = new URLSearchParams();
  if (cursors.reportCursor) params.set('reportCursor', cursors.reportCursor);
  if (cursors.actionCursor) params.set('actionCursor', cursors.actionCursor);
  if (cursors.strikeCursor) params.set('strikeCursor', cursors.strikeCursor);
  if (cursors.limit) params.set('limit', String(cursors.limit));

  const query = params.toString();
  const path = `/v1/admin/moderation/content/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`;
  return platformRequest<ModerationContentDetailDto>(query ? `${path}?${query}` : path, {
    token: authTokenOrThrow(token),
  });
}

export async function applyModerationAction(
  contentType: ModerationContentType,
  contentId: string,
  payload: ModerationActionPayloadInput,
  options: { token: string | null; idempotencyKey: string },
): Promise<ModerationActionDto> {
  const path = `/v1/admin/moderation/content/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}/action`;
  const result = await platformRequest<{ action: ModerationActionDto }>(path, {
    method: 'POST',
    token: authTokenOrThrow(options.token),
    idempotencyKey: options.idempotencyKey,
    body: payload,
  });
  return result.action;
}

export async function dismissModerationContent(
  contentType: ModerationContentType,
  contentId: string,
  payload: ModerationDismissPayloadInput,
  options: { token: string | null; idempotencyKey: string },
): Promise<ModerationActionDto> {
  const path = `/v1/admin/moderation/content/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}/dismiss`;
  const result = await platformRequest<{ action: ModerationActionDto }>(path, {
    method: 'POST',
    token: authTokenOrThrow(options.token),
    idempotencyKey: options.idempotencyKey,
    body: payload,
  });
  return result.action;
}
