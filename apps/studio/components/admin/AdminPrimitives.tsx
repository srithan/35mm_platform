'use client';

import { type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type AdminRisk, type HealthState, type ReviewPriority } from '@/lib/data/admin';

const healthCopy: Record<HealthState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  offline: 'Offline',
  planned: 'Planned',
};

const healthClasses: Record<HealthState, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  degraded: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  offline: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  planned: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
};

const priorityClasses: Record<ReviewPriority, string> = {
  urgent: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  high: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
  normal: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
  low: 'border-muted bg-muted/60 text-muted-foreground',
};

const riskClasses: Record<AdminRisk, string> = {
  low: 'text-emerald-600',
  medium: 'text-amber-600',
  high: 'text-red-600',
};

export function PageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function StatusBadge({ state }: { state: HealthState }) {
  return (
    <Badge variant="outline" className={cn('capitalize', healthClasses[state])}>
      {healthCopy[state]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: ReviewPriority }) {
  return (
    <Badge variant="outline" className={cn('capitalize', priorityClasses[priority])}>
      {priority}
    </Badge>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  trend,
  risk,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  risk?: AdminRisk;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">{value}</CardTitle>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
        {trend ? <span className="font-medium text-emerald-600">{trend}</span> : null}
        {risk ? <span className={cn('font-medium', riskClasses[risk])}>{risk} risk</span> : null}
        <span>{detail}</span>
      </CardContent>
    </Card>
  );
}

export function AdminListRow({
  icon: Icon,
  title,
  description,
  meta,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  meta?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      {Icon ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}
