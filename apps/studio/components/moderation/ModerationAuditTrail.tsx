'use client';

import { Bot, ShieldCheck } from 'lucide-react';
import type { ModerationActionDto } from '@35mm/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime, MODERATION_ACTION_LABELS } from '@/lib/moderation/constants';

function durationLabel(metadata: Record<string, unknown>): string | null {
  const minutes = metadata.durationMinutes;
  if (typeof minutes !== 'number' || minutes <= 0) return null;
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `for ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `for ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `for ${minutes} minutes`;
}

export function ModerationAuditTrail({
  title,
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  emptyLabel,
}: {
  title: string;
  items: ModerationActionDto[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null}
        {items.map((action) => {
          const duration = durationLabel(action.metadata);
          return (
            <div key={action.id} className="flex gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted/40">
                {action.actorType === 'system' ? (
                  <Bot className="size-3.5 text-muted-foreground" />
                ) : (
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{MODERATION_ACTION_LABELS[action.action]}</span>
                  <Badge variant="outline" className="capitalize">
                    {action.actorType}
                  </Badge>
                  {duration ? <span className="text-xs text-muted-foreground">{duration}</span> : null}
                  <span
                    className="text-xs text-muted-foreground"
                    title={new Date(action.createdAt).toLocaleString()}
                  >
                    · {formatRelativeTime(action.createdAt)}
                  </span>
                </div>
                <p className="break-words text-sm text-muted-foreground">{action.reason}</p>
                {action.notes ? (
                  <p className="break-words border-l-2 border-border pl-3 text-sm text-muted-foreground">
                    {action.notes}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
        {hasMore ? (
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
