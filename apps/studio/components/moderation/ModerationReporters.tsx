'use client';

import type { ModerationReportDetailDto } from '@35mm/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModerationAuthor } from '@/components/moderation/ModerationAuthor';
import { ReportStatusBadge } from '@/components/moderation/ModerationBadges';
import { formatRelativeTime, reportReasonLabel } from '@/lib/moderation/constants';

export function ModerationReporters({
  reports,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  reports: ModerationReportDetailDto[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reporters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reporter records.</p>
        ) : null}
        {reports.map((report) => (
          <div key={report.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <ModerationAuthor author={report.reporter} size="sm" />
              <ReportStatusBadge status={report.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium">{reportReasonLabel(report.reason)}</span>
              <span className="text-xs text-muted-foreground">· {formatRelativeTime(report.createdAt)}</span>
            </div>
            {report.details ? (
              <p className="mt-1.5 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                {report.details}
              </p>
            ) : null}
          </div>
        ))}
        {hasMore ? (
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more reporters'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
