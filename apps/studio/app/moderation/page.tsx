'use client';

import { CheckCircle2, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AdminMetricCard, PageIntro, PriorityBadge } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { moderationQueue } from '@/lib/data/admin';

export default function ModerationPage() {
  const urgent = moderationQueue.filter((item) => item.priority === 'urgent').length;
  const high = moderationQueue.filter((item) => item.priority === 'high').length;

  return (
    <AppShell title="Moderation">
      <PageIntro
        title="Moderation queue"
        description="Central review lane for reported posts, profiles, media, and webhook failures that can affect user trust."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Open reviews" value={String(moderationQueue.length)} detail="items awaiting decision" risk="high" icon={ShieldAlert} />
        <AdminMetricCard label="Urgent" value={String(urgent)} detail="time-sensitive reports" risk="high" icon={Clock} />
        <AdminMetricCard label="High priority" value={String(high)} detail="needs same-day handling" risk="medium" icon={ShieldCheck} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Review inbox</CardTitle>
          <CardDescription>Prioritized admin cases</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Age</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moderationQueue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">{item.reason} · reported by {item.reporter}</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{item.queue}</TableCell>
                  <TableCell>
                    <PriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell>{item.age}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5">
                      <CheckCircle2 className="size-3.5" />
                      Triage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
