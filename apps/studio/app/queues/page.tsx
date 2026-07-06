'use client';

import { AlertTriangle, CheckCircle2, TimerReset, Workflow } from 'lucide-react';
import { AdminMetricCard, PageIntro, StatusBadge } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { queueJobs } from '@/lib/data/admin';

export default function QueuesPage() {
  const waiting = queueJobs.reduce((total, job) => total + job.waiting, 0);
  const failed = queueJobs.reduce((total, job) => total + job.failed, 0);
  const healthy = queueJobs.filter((job) => job.state === 'healthy').length;

  return (
    <AppShell title="Queues">
      <PageIntro
        title="Background jobs"
        description="BullMQ worker visibility for media processing, feed fanout, notifications, digests, and suggestions."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Waiting" value={String(waiting)} detail="jobs queued across workers" risk="medium" icon={TimerReset} />
        <AdminMetricCard label="Failed" value={String(failed)} detail="jobs requiring retry or inspection" risk={failed > 0 ? 'high' : 'low'} icon={AlertTriangle} />
        <AdminMetricCard label="Healthy jobs" value={String(healthy)} detail="workers reporting normal status" icon={CheckCircle2} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Worker queues</CardTitle>
          <CardDescription>Operational state for asynchronous platform systems</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Waiting</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Throughput</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueJobs.map((job) => (
                <TableRow key={job.name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Workflow className="size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-xs text-muted-foreground">{job.owner}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{job.queue}</TableCell>
                  <TableCell>
                    <StatusBadge state={job.state} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{job.waiting}</TableCell>
                  <TableCell className="text-right tabular-nums">{job.failed}</TableCell>
                  <TableCell>{job.throughput}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
