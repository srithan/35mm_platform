'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Copy } from 'lucide-react';
import type { ModerationContentType } from '@35mm/types';
import { AppShell } from '@/components/layout/AppShell';
import { ModerationActionPanel } from '@/components/moderation/ModerationActionPanel';
import { ModerationAuditTrail } from '@/components/moderation/ModerationAuditTrail';
import { ModerationAuthor, StrikeBadge } from '@/components/moderation/ModerationAuthor';
import { ModerationReporters } from '@/components/moderation/ModerationReporters';
import { ModerationSnapshotCard } from '@/components/moderation/ModerationSnapshotCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useModerationContent } from '@/hooks/useModerationContent';
import { CONTENT_TYPE_LABELS } from '@/lib/moderation/constants';

const VALID_TYPES: ModerationContentType[] = ['post', 'comment', 'profile'];

function isContentType(value: unknown): value is ModerationContentType {
  return typeof value === 'string' && (VALID_TYPES as string[]).includes(value);
}

export default function ModerationDetailPage() {
  const params = useParams<{ contentType: string; contentId: string }>();
  const contentType = params.contentType;
  const contentId = params.contentId;

  if (!isContentType(contentType)) {
    return (
      <AppShell title="Moderation">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </span>
            <p className="text-sm font-medium">Unsupported content type “{contentType}”.</p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return <ModerationContentDetail contentType={contentType} contentId={contentId} />;
}

function BackLink() {
  return (
    <Link
      href="/moderation"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to queue
    </Link>
  );
}

function ModerationContentDetail({
  contentType,
  contentId,
}: {
  contentType: ModerationContentType;
  contentId: string;
}) {
  const {
    detailQuery,
    reports,
    actions,
    strikes,
    loadMoreReports,
    loadMoreActions,
    loadMoreStrikes,
    applyAction,
    dismiss,
  } = useModerationContent(contentType, contentId);

  const detail = detailQuery.data;

  return (
    <AppShell title="Moderation">
      <BackLink />

      {detailQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : null}

      {detailQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Could not load this case</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {detailQuery.error instanceof Error ? detailQuery.error.message : 'Unknown error.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {detail ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {CONTENT_TYPE_LABELS[contentType]} review
              </h2>
              <ModerationAuthor author={detail.author} strikeCount={detail.author.strikeCount} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => void navigator.clipboard.writeText(contentId)}
            >
              <Copy className="size-3.5" />
              Copy ID
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <ModerationSnapshotCard detail={detail} />
              <ModerationReporters
                reports={reports.items}
                hasMore={reports.hasMore}
                loadingMore={reports.loadingMore}
                onLoadMore={() => void loadMoreReports()}
              />
              <ModerationAuditTrail
                title="Audit trail"
                items={actions.items}
                hasMore={actions.hasMore}
                loadingMore={actions.loadingMore}
                onLoadMore={() => void loadMoreActions()}
                emptyLabel="No moderation actions recorded yet."
              />
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">Author context</CardTitle>
                  <StrikeBadge count={detail.author.strikeCount} />
                </CardHeader>
                <CardContent>
                  <ModerationAuthor author={detail.author} size="sm" />
                </CardContent>
              </Card>

              <ModerationActionPanel applyAction={applyAction} dismiss={dismiss} />

              <ModerationAuditTrail
                title="Author strike history"
                items={strikes.items}
                hasMore={strikes.hasMore}
                loadingMore={strikes.loadingMore}
                onLoadMore={() => void loadMoreStrikes()}
                emptyLabel="No prior moderation actions for this author."
              />
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
