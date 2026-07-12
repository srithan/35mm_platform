'use client';

import Link from 'next/link';
import { ExternalLink, ImageOff } from 'lucide-react';
import type { ModerationContentDetailDto, ModerationContentSnapshot } from '@35mm/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentStatusBadge } from '@/components/moderation/ModerationBadges';
import {
  CONTENT_TYPE_LABELS,
  snapshotMedia,
  snapshotValue,
  visibleTextFromBody,
} from '@/lib/moderation/constants';

function BodyText({ body }: { body: string }) {
  if (!body) {
    return <p className="text-sm italic text-muted-foreground">No text content in snapshot.</p>;
  }
  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{body}</p>;
}

function MediaGrid({ snapshot }: { snapshot: ModerationContentSnapshot }) {
  const media = snapshotMedia(snapshot);
  if (media.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {media.map((item, index) => (
        <a
          key={`${item.url}:${index}`}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
        >
          {item.type === 'video' ? (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              Video
            </span>
          ) : (
            // R2 / user-media hostnames are not in next/image remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl || item.url}
              alt={item.altText || 'Reported media'}
              loading="lazy"
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          )}
        </a>
      ))}
    </div>
  );
}

export function ModerationSnapshotCard({ detail }: { detail: ModerationContentDetailDto }) {
  const snapshot = detail.reports.items[0]?.contentSnapshot ?? {};
  const { contentType } = detail;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">{CONTENT_TYPE_LABELS[contentType]} snapshot</CardTitle>
        <ContentStatusBadge status={detail.state.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.keys(snapshot).length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageOff className="size-4" />
            No snapshot was captured for this report.
          </div>
        ) : null}

        {contentType === 'post' ? (
          <>
            {snapshotValue(snapshot, 'headline') ? (
              <h3 className="font-heading text-lg font-medium">{snapshotValue(snapshot, 'headline')}</h3>
            ) : null}
            <BodyText body={visibleTextFromBody(snapshot.body)} />
            <MediaGrid snapshot={snapshot} />
          </>
        ) : null}

        {contentType === 'comment' ? (
          <>
            <BodyText body={visibleTextFromBody(snapshot.body)} />
            {snapshotValue(snapshot, 'post_id') ? (
              <Link
                href={`/moderation/post/${snapshotValue(snapshot, 'post_id')}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
              >
                <ExternalLink className="size-3.5" />
                View parent post
              </Link>
            ) : null}
          </>
        ) : null}

        {contentType === 'profile' ? (
          <div className="flex items-start gap-4">
            <Avatar size="lg">
              {snapshotValue(snapshot, 'avatar_url') ? (
                <AvatarImage src={snapshotValue(snapshot, 'avatar_url') ?? ''} alt="Reported avatar" />
              ) : null}
              <AvatarFallback>
                {(snapshotValue(snapshot, 'username') ?? '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{snapshotValue(snapshot, 'display_name') ?? 'Unknown'}</p>
              {snapshotValue(snapshot, 'username') ? (
                <p className="text-xs text-muted-foreground">@{snapshotValue(snapshot, 'username')}</p>
              ) : null}
              <BodyText body={snapshotValue(snapshot, 'bio') ?? ''} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
