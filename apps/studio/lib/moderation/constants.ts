import { FileText, MessageSquare, UserRound, type LucideIcon } from 'lucide-react';
import { richTextBodyToVisibleText } from '@35mm/validators';
import type {
  ModerationAction,
  ModerationContentType,
  ModerationContentSnapshot,
  ModerationReportReason,
  ModerationReportStatus,
} from '@35mm/types';

export const CONTENT_TYPE_LABELS: Record<ModerationContentType, string> = {
  post: 'Post',
  comment: 'Comment',
  profile: 'Profile',
};

export const CONTENT_TYPE_ICONS: Record<ModerationContentType, LucideIcon> = {
  post: FileText,
  comment: MessageSquare,
  profile: UserRound,
};

export const REPORT_REASON_LABELS: Record<ModerationReportReason, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate_speech: 'Hate speech',
  violence: 'Violence',
  nudity_sexual_content: 'Nudity / sexual content',
  misinformation: 'Misinformation',
  self_harm: 'Self-harm',
  impersonation: 'Impersonation',
  intellectual_property: 'Intellectual property',
  other: 'Other',
};

export const REPORT_STATUS_LABELS: Record<ModerationReportStatus, string> = {
  open: 'Open',
  reviewing: 'Reviewing',
  actioned: 'Actioned',
  dismissed: 'Dismissed',
};

export const CONTENT_TYPE_OPTIONS: ModerationContentType[] = ['post', 'comment', 'profile'];
export const REPORT_STATUS_OPTIONS: ModerationReportStatus[] = [
  'open',
  'reviewing',
  'actioned',
  'dismissed',
];
export const REPORT_REASON_OPTIONS: ModerationReportReason[] = [
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'nudity_sexual_content',
  'misinformation',
  'self_harm',
  'impersonation',
  'intellectual_property',
  'other',
];

export function reportReasonLabel(reason: ModerationReportReason): string {
  return REPORT_REASON_LABELS[reason] ?? reason;
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return iso;

  const diff = time - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60 * 1000) return 'just now';

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const { unit, ms } of RELATIVE_UNITS) {
    if (abs >= ms) {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return 'just now';
}

export type EnforcementAction = Exclude<ModerationAction, 'no_action'>;

export interface ModerationActionOption {
  value: EnforcementAction;
  label: string;
  description: string;
  /** Requires an explicit confirm step (state-changing / hard to reverse). */
  destructive: boolean;
  /** Suspend needs a duration (stored in metadata.durationMinutes). */
  needsDuration: boolean;
  /** Increments the author strike count server-side. */
  addsStrike: boolean;
}

export const MODERATION_ACTION_OPTIONS: ModerationActionOption[] = [
  {
    value: 'content_hidden',
    label: 'Hide content',
    description: 'Hide from public reads. Reversible.',
    destructive: true,
    needsDuration: false,
    addsStrike: false,
  },
  {
    value: 'content_removed',
    label: 'Remove content',
    description: 'Take the content down for a policy violation.',
    destructive: true,
    needsDuration: false,
    addsStrike: false,
  },
  {
    value: 'content_warning_added',
    label: 'Add warning label',
    description: 'Keep visible but attach a moderation warning.',
    destructive: false,
    needsDuration: false,
    addsStrike: false,
  },
  {
    value: 'user_warned',
    label: 'Warn user',
    description: 'Record a warning against the author. Adds a strike.',
    destructive: false,
    needsDuration: false,
    addsStrike: true,
  },
  {
    value: 'user_suspended',
    label: 'Suspend user',
    description: 'Suspend the account for a set duration. Adds a strike.',
    destructive: true,
    needsDuration: true,
    addsStrike: true,
  },
  {
    value: 'user_banned',
    label: 'Ban user',
    description: 'Permanently ban the account. Adds a strike.',
    destructive: true,
    needsDuration: false,
    addsStrike: true,
  },
  {
    value: 'escalated',
    label: 'Escalate',
    description: 'Flag for senior review. Adds a strike.',
    destructive: false,
    needsDuration: false,
    addsStrike: true,
  },
];

export const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  no_action: 'No action',
  content_hidden: 'Hid content',
  content_removed: 'Removed content',
  content_warning_added: 'Added warning label',
  user_warned: 'Warned user',
  user_suspended: 'Suspended user',
  user_banned: 'Banned user',
  escalated: 'Escalated',
};

export const SUSPEND_DURATION_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: '1 day', minutes: 24 * 60 },
  { label: '3 days', minutes: 3 * 24 * 60 },
  { label: '7 days', minutes: 7 * 24 * 60 },
  { label: '14 days', minutes: 14 * 24 * 60 },
  { label: '30 days', minutes: 30 * 24 * 60 },
];

function snapshotString(snapshot: ModerationContentSnapshot, key: string): string | null {
  const value = snapshot[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * Best-effort plain-text preview from a moderation snapshot. Snapshots persist
 * server-side, so this renders even when the live content is gone or moderated.
 */
export function snapshotPreview(
  contentType: ModerationContentType,
  snapshot: ModerationContentSnapshot,
): string {
  if (contentType === 'profile') {
    const username = snapshotString(snapshot, 'username');
    const bio = snapshotString(snapshot, 'bio');
    if (username && bio) return `@${username} — ${bio}`;
    if (username) return `@${username}`;
    return bio ?? 'Profile snapshot unavailable';
  }

  const headline = snapshotString(snapshot, 'headline');
  const body = snapshotString(snapshot, 'body');
  const visibleBody = body ? safeVisibleText(body) : '';

  if (headline && visibleBody) return `${headline} — ${visibleBody}`;
  if (headline) return headline;
  if (visibleBody) return visibleBody;
  return contentType === 'comment' ? 'Empty comment snapshot' : 'Empty post snapshot';
}

export function visibleTextFromBody(body: unknown): string {
  if (typeof body !== 'string' || !body.trim()) return '';
  return safeVisibleText(body);
}

export function snapshotValue(snapshot: ModerationContentSnapshot, key: string): string | null {
  return snapshotString(snapshot, key);
}

export interface SnapshotMediaItem {
  type: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
}

export function snapshotMedia(snapshot: ModerationContentSnapshot): SnapshotMediaItem[] {
  const media = snapshot.media;
  if (!Array.isArray(media)) return [];
  const result: SnapshotMediaItem[] = [];
  for (const raw of media) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const url = typeof item.url === 'string' ? item.url : null;
    if (!url) continue;
    result.push({
      type: typeof item.type === 'string' ? item.type : 'image',
      url,
      thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : undefined,
      altText: typeof item.altText === 'string' ? item.altText : undefined,
    });
  }
  return result;
}

function safeVisibleText(body: string): string {
  try {
    const text = richTextBodyToVisibleText(body).trim();
    if (text) return text;
  } catch (_error) {
    // fall back to the raw stored value below
  }
  return body.trim();
}
