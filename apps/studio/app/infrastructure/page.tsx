'use client';

import { Database, RadioTower, Search, Server } from 'lucide-react';
import { AdminListRow, AdminMetricCard, PageIntro, StatusBadge } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { platformConfig, platformServices } from '@/lib/data/admin';

export default function InfrastructurePage() {
  const healthy = platformServices.filter((service) => service.state === 'healthy').length;
  const degraded = platformServices.filter((service) => service.state === 'degraded').length;
  const planned = platformServices.filter((service) => service.state === 'planned').length;

  return (
    <AppShell title="Infrastructure">
      <PageIntro
        title="Infrastructure"
        description="Deployment and dependency status for web, API, worker, database, cache, realtime, storage, and search."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Healthy" value={String(healthy)} detail="services operating normally" icon={Server} />
        <AdminMetricCard label="Degraded" value={String(degraded)} detail="services requiring attention" risk="medium" icon={Database} />
        <AdminMetricCard label="Planned" value={String(planned)} detail="integration surfaces not fully wired" risk="medium" icon={RadioTower} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Operational health and platform ownership</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {platformServices.map((service) => (
              <AdminListRow
                key={service.name}
                title={service.name}
                description={service.detail}
                meta={service.owner}
              >
                {service.uptime ? <span className="hidden text-xs text-muted-foreground sm:inline">{service.uptime}</span> : null}
                <StatusBadge state={service.state} />
              </AdminListRow>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness gaps</CardTitle>
            <CardDescription>Configuration areas to track before production expansion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {platformConfig.map((item) => (
              <AdminListRow
                key={`${item.area}-${item.key}`}
                icon={item.area === 'Search' ? Search : undefined}
                title={item.key}
                description={`${item.area}: ${item.detail}`}
              >
                <StatusBadge state={item.state} />
              </AdminListRow>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
