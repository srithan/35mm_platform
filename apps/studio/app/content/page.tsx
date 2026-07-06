'use client';

import Link from 'next/link';
import { Clapperboard, Film, ListChecks, MessageSquareText } from 'lucide-react';
import { AdminListRow, AdminMetricCard, PageIntro } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { contentQueue } from '@/lib/data/admin';

const contentCounts = {
  published: contentQueue.filter((item) => item.state === 'published').length,
  drafts: contentQueue.filter((item) => item.state === 'draft').length,
  flagged: contentQueue.filter((item) => item.state === 'flagged').length,
  verification: contentQueue.filter((item) => item.state === 'needs verification').length,
};

export default function ContentPage() {
  return (
    <AppShell
      title="Content"
      actionSlot={
        <Link href="/films/new">
          <Button size="sm" className="h-8 gap-1.5">
            <Film className="size-3.5" />
            Add film
          </Button>
        </Link>
      }
    >
      <PageIntro
        title="Content operations"
        description="Review published content, draft editorial work, film identity checks, and flagged media across the platform."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Published" value={String(contentCounts.published)} detail="items currently live" icon={MessageSquareText} />
        <AdminMetricCard label="Drafts" value={String(contentCounts.drafts)} detail="editorial work in progress" icon={ListChecks} />
        <AdminMetricCard label="Flagged" value={String(contentCounts.flagged)} detail="content needing review" risk="high" icon={Clapperboard} />
        <AdminMetricCard label="Film verification" value={String(contentCounts.verification)} detail="catalog identity checks" risk="medium" icon={Film} />
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Content queue</CardTitle>
            <CardDescription>Cross-surface items for admin review and editorial follow-up</CardDescription>
          </div>
          <div className="flex gap-2">
            <Link href="/films">
              <Button variant="outline" size="sm" className="h-8">Films</Button>
            </Link>
            <Link href="/shelves">
              <Button variant="outline" size="sm" className="h-8">Shelves</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {contentQueue.map((item) => (
            <AdminListRow
              key={item.id}
              title={item.title}
              description={`${item.type} · ${item.owner} · ${item.detail}`}
              meta={item.updatedAt}
            >
              <Badge variant={item.state === 'flagged' ? 'destructive' : 'secondary'} className="capitalize">
                {item.state}
              </Badge>
            </AdminListRow>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
