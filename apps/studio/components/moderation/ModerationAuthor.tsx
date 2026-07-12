'use client';

import { AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ModerationAuthorSummary {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

function initials(value: string): string {
  return (
    value
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function StrikeBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        No strikes
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className={cn('gap-1', className)}>
      <AlertTriangle className="size-3" />
      {count} {count === 1 ? 'strike' : 'strikes'}
    </Badge>
  );
}

export function ModerationAuthor({
  author,
  strikeCount,
  size = 'default',
}: {
  author: ModerationAuthorSummary;
  strikeCount?: number;
  size?: 'default' | 'sm' | 'lg';
}) {
  const label = author.displayName || author.username || 'Unknown author';

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size={size}>
        {author.avatarUrl ? <AvatarImage src={author.avatarUrl} alt={label} /> : null}
        <AvatarFallback>{initials(label)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {author.username ? (
          <p className="truncate text-xs text-muted-foreground">@{author.username}</p>
        ) : null}
      </div>
      {typeof strikeCount === 'number' ? <StrikeBadge count={strikeCount} className="ml-1 shrink-0" /> : null}
    </div>
  );
}
