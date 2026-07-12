'use client';

import { Suspense, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageIntro } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { ModerationQueueFilters } from '@/components/moderation/ModerationQueueFilters';
import { ModerationQueueTable } from '@/components/moderation/ModerationQueueTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModerationQueue } from '@/hooks/useModerationQueue';
import { useModerationQueueFilters } from '@/hooks/useModerationQueueFilters';

export default function ModerationPage() {
  return (
    <AppShell title="Moderation">
      <PageIntro
        title="Review queue"
        description="Reported posts, comments, and profiles grouped by target. Snapshots persist server-side, so cases stay reviewable even after the live content is hidden or removed."
      />
      <Suspense fallback={<ModerationQueueTable items={[]} isLoading />}>
        <ModerationQueueView />
      </Suspense>
    </AppShell>
  );
}

function ModerationQueueView() {
  const { filters } = useModerationQueueFilters();
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setCursorStack([null]);
  }, [filters.status, filters.contentType, filters.reason, pageSize]);

  const currentCursor = cursorStack[cursorStack.length - 1] ?? null;
  const queueQuery = useModerationQueue(filters, currentCursor, pageSize);
  const isLoading = queueQuery.isLoading || queueQuery.isFetching;
  const items = queueQuery.data?.items ?? [];
  const hasMore = Boolean(queueQuery.data?.hasMore && queueQuery.data.nextCursor);

  return (
    <>
      <ModerationQueueFilters />

      {queueQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Could not load the moderation queue</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {queueQuery.error instanceof Error ? queueQuery.error.message : 'Unknown error.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void queueQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ModerationQueueTable items={items} isLoading={isLoading} />
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setCursorStack((current) => (current.length > 1 ? current.slice(0, -1) : current))}
            disabled={cursorStack.length === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {cursorStack.length}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              const next = queueQuery.data?.nextCursor;
              if (!next) return;
              setCursorStack((current) => [...current, next]);
            }}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
