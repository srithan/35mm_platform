'use client';

import { X } from 'lucide-react';
import type {
  ModerationContentType,
  ModerationReportReason,
  ModerationReportStatus,
} from '@35mm/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModerationQueueFilters } from '@/hooks/useModerationQueueFilters';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_OPTIONS,
  REPORT_REASON_LABELS,
  REPORT_REASON_OPTIONS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_OPTIONS,
} from '@/lib/moderation/constants';

const ALL_VALUE = '__all__';

export function ModerationQueueFilters() {
  const { filters, setFilters, clear, hasFilters } = useModerationQueueFilters();

  return (
    <Card className="w-full">
      <CardContent className="grid gap-3 pt-4 md:grid-cols-[180px_180px_minmax(200px,1fr)_auto]">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={filters.status ?? ALL_VALUE}
            onValueChange={(value) =>
              void setFilters({ status: value === ALL_VALUE ? null : (value as ModerationReportStatus) })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
              {REPORT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {REPORT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Content type</Label>
          <Select
            value={filters.contentType ?? ALL_VALUE}
            onValueChange={(value) =>
              void setFilters({ contentType: value === ALL_VALUE ? null : (value as ModerationContentType) })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All types</SelectItem>
              {CONTENT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {CONTENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Reason</Label>
          <Select
            value={filters.reason ?? ALL_VALUE}
            onValueChange={(value) =>
              void setFilters({ reason: value === ALL_VALUE ? null : (value as ModerationReportReason) })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All reasons</SelectItem>
              {REPORT_REASON_OPTIONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {REPORT_REASON_LABELS[reason]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters ? (
          <Button variant="ghost" size="sm" className="self-end text-muted-foreground" onClick={clear}>
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
