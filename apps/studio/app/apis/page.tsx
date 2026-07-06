import Link from 'next/link';
import { Braces, Database, Filter, Search, Server, ShieldCheck } from 'lucide-react';
import { AdminMetricCard, PageIntro } from '@/components/admin/AdminPrimitives';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  apiAuthIcons,
  apiContracts,
  apiEndpoints,
  apiGroups,
  apiMethodClasses,
  apiStatusClasses,
  apiTechStack,
  type ApiEndpoint,
} from '@/lib/data/apiReference';
import { cn } from '@/lib/utils';

const allGroupsValue = 'all';

function searchableText(endpoint: ApiEndpoint) {
  return [
    endpoint.method,
    endpoint.path,
    endpoint.group,
    endpoint.auth,
    endpoint.status,
    endpoint.summary,
    endpoint.query,
    endpoint.body,
    endpoint.response,
    endpoint.notes,
    endpoint.source,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function EndpointBlock({ endpoint }: { endpoint: ApiEndpoint }) {
  const AuthIcon = apiAuthIcons[endpoint.auth];

  return (
    <article className="rounded-lg border bg-background p-3 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('font-mono', apiMethodClasses[endpoint.method])}>
              {endpoint.method}
            </Badge>
            <code className="break-all rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
              {endpoint.path}
            </code>
            <Badge variant="outline" className={apiStatusClasses[endpoint.status]}>
              {endpoint.status}
            </Badge>
          </div>
          <p className="text-sm font-medium leading-5">{endpoint.summary}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
          <AuthIcon className="size-3.5" />
          <span>{endpoint.auth}</span>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        {endpoint.query ? (
          <div className="rounded-md bg-muted/40 p-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">Query</dt>
            <dd className="mt-1 text-xs leading-5">{endpoint.query}</dd>
          </div>
        ) : null}
        {endpoint.body ? (
          <div className="rounded-md bg-muted/40 p-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">Body</dt>
            <dd className="mt-1 text-xs leading-5">{endpoint.body}</dd>
          </div>
        ) : null}
        <div className="rounded-md bg-muted/40 p-2">
          <dt className="text-[11px] font-semibold uppercase text-muted-foreground">Response</dt>
          <dd className="mt-1 text-xs leading-5">{endpoint.response}</dd>
        </div>
        {endpoint.notes ? (
          <div className="rounded-md bg-muted/40 p-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">Notes</dt>
            <dd className="mt-1 text-xs leading-5">{endpoint.notes}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-3 truncate border-t pt-2 font-mono text-[11px] text-muted-foreground">{endpoint.source}</p>
    </article>
  );
}

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function apiHref(params: { group?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.group && params.group !== allGroupsValue) search.set('group', params.group);
  if (params.q && params.q.trim()) search.set('q', params.q.trim());
  const qs = search.toString();
  return qs ? `/apis?${qs}` : '/apis';
}

export default async function ApiReferencePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = normalizeParam(resolvedSearchParams?.q);
  const requestedGroup = normalizeParam(resolvedSearchParams?.group);
  const activeGroup = apiGroups.some((group) => group.id === requestedGroup) ? requestedGroup : allGroupsValue;
  const normalizedQuery = query.trim().toLowerCase();

  const filteredEndpoints = apiEndpoints.filter((endpoint) => {
    const groupMatches = activeGroup === allGroupsValue || endpoint.group === activeGroup;
    const queryMatches = !normalizedQuery || searchableText(endpoint).includes(normalizedQuery);
    return groupMatches && queryMatches;
  });

  const endpointsByGroup = apiGroups
    .map((group) => ({
      group,
      endpoints: filteredEndpoints.filter((endpoint) => endpoint.group === group.id),
    }))
    .filter((item) => item.endpoints.length > 0);

  const protectedCount = apiEndpoints.filter((endpoint) => endpoint.auth === 'Bearer required').length;
  const liveCount = apiEndpoints.filter((endpoint) => endpoint.status === 'Live').length;
  const mutationCount = apiEndpoints.filter((endpoint) => endpoint.method !== 'GET').length;

  return (
    <AppShell title="APIs">
      <PageIntro
        title="API reference"
        description="Operationally useful map of the 35mm Platform API surface: endpoints, auth, payloads, responses, implementation notes, and source ownership."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Endpoints" value={String(apiEndpoints.length)} detail="Hono plus web proxy routes" icon={Braces} />
        <AdminMetricCard label="Live routes" value={String(liveCount)} detail="implemented API contracts" icon={Server} />
        <AdminMetricCard label="Protected" value={String(protectedCount)} detail="require Clerk bearer auth" icon={ShieldCheck} />
        <AdminMetricCard label="Mutations" value={String(mutationCount)} detail="POST, PATCH, and DELETE routes" icon={Database} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(220px,280px)_1fr]">
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Find APIs</CardTitle>
              <CardDescription>Search path, payload, source, notes, or status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action="/apis" className="space-y-2">
                {activeGroup !== allGroupsValue ? <input type="hidden" name="group" value={activeGroup} /> : null}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="q"
                    defaultValue={query}
                    placeholder="Search endpoints"
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pl-8 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                  />
                </div>
                <Button type="submit" size="sm" className="h-8 w-full gap-1.5">
                  <Search className="size-3.5" />
                  Search
                </Button>
              </form>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredEndpoints.length} shown</span>
                {query || activeGroup !== allGroupsValue ? (
                  <Link href="/apis" className="rounded-md px-2 py-1 text-xs text-foreground hover:bg-muted">
                    Reset
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Groups</CardTitle>
              <CardDescription>Filter by implementation area</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link
                href={apiHref({ q: query })}
                className={cn(
                  'flex h-8 w-full items-center justify-start gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-muted',
                  activeGroup === allGroupsValue ? 'bg-secondary text-secondary-foreground' : 'text-foreground/80',
                )}
              >
                <Filter className="size-3.5" />
                All endpoints
              </Link>
              {apiGroups.map((group) => {
                const count = apiEndpoints.filter((endpoint) => endpoint.group === group.id).length;
                const Icon = group.icon;

                return (
                  <Link
                    key={group.id}
                    href={apiHref({ group: group.id, q: query })}
                    className={cn(
                      'flex h-auto min-h-8 w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-muted',
                      activeGroup === group.id ? 'bg-secondary text-secondary-foreground' : 'text-foreground/80',
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform contracts</CardTitle>
              <CardDescription>Shared rules every consumer should know before calling endpoints</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {apiContracts.map((contract) => (
                <div key={contract.label} className="rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{contract.label}</p>
                  <p className="mt-1 text-sm leading-5">{contract.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tech map</CardTitle>
              <CardDescription>Runtime and dependency context behind the API surface</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {apiTechStack.map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm leading-5">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {endpointsByGroup.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No endpoints match the current filters.
              </CardContent>
            </Card>
          ) : null}

          {endpointsByGroup.map(({ group, endpoints }) => {
            const Icon = group.icon;

            return (
              <section key={group.id} className="space-y-3">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold">{group.label}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                        <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{group.owner}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{endpoints.length} endpoints</Badge>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    {endpoints.map((endpoint) => (
                      <EndpointBlock key={`${endpoint.method}-${endpoint.path}`} endpoint={endpoint} />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
