'use client';

import type { ModerationContentStatus, ModerationReportStatus } from '@35mm/types';
import { Badge } from '@/components/ui/badge';
import { REPORT_STATUS_LABELS } from '@/lib/moderation/constants';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const REPORT_STATUS_VARIANT: Record<ModerationReportStatus, BadgeVariant> = {
  open: 'default',
  reviewing: 'secondary',
  actioned: 'destructive',
  dismissed: 'outline',
};

const CONTENT_STATUS_VARIANT: Record<ModerationContentStatus, BadgeVariant> = {
  visible: 'outline',
  hidden: 'secondary',
  removed: 'destructive',
};

const CONTENT_STATUS_LABELS: Record<ModerationContentStatus, string> = {
  visible: 'Visible',
  hidden: 'Hidden',
  removed: 'Removed',
};

export function ReportStatusBadge({ status }: { status: ModerationReportStatus }) {
  return <Badge variant={REPORT_STATUS_VARIANT[status]}>{REPORT_STATUS_LABELS[status]}</Badge>;
}

export function ContentStatusBadge({ status }: { status: ModerationContentStatus }) {
  return <Badge variant={CONTENT_STATUS_VARIANT[status]}>{CONTENT_STATUS_LABELS[status]}</Badge>;
}
