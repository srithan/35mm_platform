'use client';

import { useRouter } from 'next/navigation';
import type { ModerationQueueItemDto } from '@35mm/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ModerationAuthor } from '@/components/moderation/ModerationAuthor';
import { ReportStatusBadge } from '@/components/moderation/ModerationBadges';
import {
  CONTENT_TYPE_ICONS,
  CONTENT_TYPE_LABELS,
  formatRelativeTime,
  REPORT_REASON_LABELS,
  snapshotPreview,
} from '@/lib/moderation/constants';

const MAX_REASONS = 3;

function itemHref(item: ModerationQueueItemDto): string {
  return `/moderation/${item.contentType}/${item.contentId}`;
}

export function ModerationQueueTable({
  items,
  isLoading,
}: {
  items: ModerationQueueItemDto[];
  isLoading: boolean;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {new Array(8).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium text-muted-foreground">Content</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Reasons</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Author</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Reports</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Last reported</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No reports match these filters.
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((item) => {
            const Icon = CONTENT_TYPE_ICONS[item.contentType];
            const href = itemHref(item);
            const extraReasons = item.reasons.length - MAX_REASONS;
            return (
              <TableRow
                key={`${item.contentType}:${item.contentId}`}
                role="link"
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => router.push(href)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(href);
                  }
                }}
              >
                <TableCell className="max-w-[360px]">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {CONTENT_TYPE_LABELS[item.contentType]}
                      </p>
                      <p className="line-clamp-2 text-sm">{snapshotPreview(item.contentType, item.contentSnapshot)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.reasons.slice(0, MAX_REASONS).map((entry) => (
                      <Badge key={entry.reason} variant="secondary" className="gap-1">
                        {REPORT_REASON_LABELS[entry.reason]}
                        <span className="tabular-nums text-muted-foreground">{entry.count}</span>
                      </Badge>
                    ))}
                    {extraReasons > 0 ? (
                      <Badge variant="outline">+{extraReasons}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <ModerationAuthor author={item.author} strikeCount={item.authorStrikeCount} size="sm" />
                </TableCell>
                <TableCell className="tabular-nums">{item.reportCount}</TableCell>
                <TableCell>
                  <ReportStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatRelativeTime(item.lastReportedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
