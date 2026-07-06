'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Database,
  Film,
  Image,
  Layers,
  MessageCircle,
  Plus,
  UserPlus,
  UserRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { AdminListRow, AdminMetricCard, PageIntro, StatusBadge } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { platformSurfaces } from '@/lib/data/admin';
import {
  useStudioOverview,
  type OverviewActivityKind,
  type OverviewMetricKey,
} from '@/lib/studio/api';

const metricIcons: Record<OverviewMetricKey, LucideIcon> = {
  activeUsers: UserRound,
  feedPosts: MessageCircle,
  mediaPosts: Image,
  pendingJobs: Workflow,
};

const activityIcons: Record<OverviewActivityKind, LucideIcon> = {
  user: UserPlus,
  post: MessageCircle,
  job: Workflow,
};

export default function DashboardPage() {
  const overview = useStudioOverview();
  const services = overview.data?.services ?? [];
  const activity = overview.data?.activity ?? [];
  const catalog = overview.data?.catalog;
  const degradedServices = services.filter((service) => service.state === 'degraded' || service.state === 'offline').length;

  return (
    <AppShell
      title="Overview"
      actionSlot={
        <Link href="/moderation">
          <Button size="sm" className="h-8 gap-1.5">
            <ArrowRight className="size-3.5" />
            Review queue
          </Button>
        </Link>
      }
    >
      <PageIntro
        title="Platform operations"
        description="Admin command center for 35mm Platform users, content, catalog, moderation, jobs, and infrastructure."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.data?.metrics.map((metric) => (
          <AdminMetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            risk={metric.risk}
            icon={metricIcons[metric.key]}
          />
        )) ?? (
          <>
            <AdminMetricCard label="Loading" value="..." detail="reading Studio overview API" icon={Database} />
            <AdminMetricCard label="Loading" value="..." detail="reading Studio overview API" icon={Database} />
            <AdminMetricCard label="Loading" value="..." detail="reading Studio overview API" icon={Database} />
            <AdminMetricCard label="Loading" value="..." detail="reading Studio overview API" icon={Database} />
          </>
        )}
      </section>

      {overview.isError ? (
        <Card className="border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="pt-4 text-sm text-red-900 dark:text-red-200">
            {overview.error instanceof Error ? overview.error.message : 'Overview API failed'}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Service health</CardTitle>
              <CardDescription>Runtime status across product and infrastructure surfaces</CardDescription>
            </div>
            <Link href="/infrastructure">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Inspect
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {services.map((service) => (
              <AdminListRow
                key={service.name}
                title={service.name}
                description={service.detail}
                meta={service.owner}
              >
                <StatusBadge state={service.state} />
              </AdminListRow>
            ))}
            {services.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Loading service configuration.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational activity</CardTitle>
            <CardDescription>Current items requiring admin awareness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.map((item) => (
              <AdminListRow
                key={item.id}
                icon={activityIcons[item.kind]}
                title={item.title}
                description={item.detail}
                meta={item.meta}
              />
            ))}
            {activity.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No recent account, post, or job events found.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Catalog control</CardTitle>
              <CardDescription>Film and shelf data still managed directly in Studio</CardDescription>
            </div>
            <Link href="/films/new">
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Plus className="size-3.5" />
                Film
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Film className="size-4 text-muted-foreground" />
                Films
              </div>
              <p className="text-3xl font-semibold tabular-nums">{catalog ? catalog.films : '...'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{catalog ? `${catalog.verifiedFilms} verified, ${catalog.manualFilms} user contributed` : 'reading catalog aggregates'}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Layers className="size-4 text-muted-foreground" />
                Shelves
              </div>
              <p className="text-3xl font-semibold tabular-nums">{catalog ? catalog.shelves : '...'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Film list records in platform database</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin surface map</CardTitle>
            <CardDescription>Whole-platform areas Studio now owns operationally</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {platformSurfaces.map((surface) => (
              <div key={surface.label} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <surface.icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{surface.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{surface.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {degradedServices > 0 ? (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{degradedServices} platform service needs attention</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">Queue and infrastructure pages show the affected systems and follow-up areas.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/queues">
                <Button size="sm" variant="outline" className="h-8 bg-background/60">Queues</Button>
              </Link>
              <Link href="/infrastructure">
                <Button size="sm" className="h-8">Infrastructure</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
