'use client';

import { AdminListRow, PageIntro, StatusBadge } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { platformConfig } from '@/lib/data/admin';

const envGroups = [
  {
    title: 'Web',
    description: 'Browser and Next.js runtime configuration',
    keys: [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'TMDB_API_KEY',
      'NEXT_PUBLIC_ABLY_API_KEY',
    ],
  },
  {
    title: 'API',
    description: 'Server auth, storage, queue, cache, and webhook configuration',
    keys: [
      'DATABASE_URL',
      'CLERK_SECRET_KEY',
      'CLERK_WEBHOOK_SECRET',
      'R2_ACCOUNT_ID',
      'R2_BUCKET',
      'RATE_LIMIT_REDIS_URL',
      'QUEUE_REDIS_URL',
      'UPSTASH_REDIS_URL',
      'ABLY_API_KEY',
      'CORS_ORIGIN',
    ],
  },
  {
    title: 'Worker',
    description: 'Long-running background processing configuration',
    keys: [
      'DATABASE_URL',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_PUBLIC_BASE_URL',
      'WORKER_CONCURRENCY',
      'MEDIA_JOB_BATCH_SIZE',
    ],
  },
];

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <PageIntro
        title="Admin settings"
        description="Operational configuration reference for 35mm Platform services. These values are represented here for admins; secrets still belong in each app environment."
      />

      <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Configuration readiness</CardTitle>
            <CardDescription>Platform areas that need deployment or secret review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {platformConfig.map((item) => (
              <AdminListRow
                key={`${item.area}-${item.key}`}
                title={item.area}
                description={`${item.key}: ${item.detail}`}
              >
                <StatusBadge state={item.state} />
              </AdminListRow>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment map</CardTitle>
            <CardDescription>Admin-facing checklist for service owners</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {envGroups.map((group) => (
              <div key={group.title} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{group.title}</p>
                <p className="mt-1 min-h-9 text-xs text-muted-foreground">{group.description}</p>
                <div className="mt-3 space-y-1">
                  {group.keys.map((key) => (
                    <div key={key} className="rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
