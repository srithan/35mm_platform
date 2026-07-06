import type { ReactNode } from 'react';
import Link from 'next/link';
import { Activity, DatabaseZap, Film, ShieldCheck, UsersRound } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const posterTiles = [
  {
    title: 'The Last Refrain',
    meta: 'Feature • Released',
    src: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=520&q=70',
  },
  {
    title: 'Nightline Unit',
    meta: 'Series • In production',
    src: 'https://images.unsplash.com/photo-1440404653325-2f2d9f3f7f3a?auto=format&fit=crop&w=520&q=70',
  },
  {
    title: 'Deep Winter',
    meta: 'Documentary • Verified',
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=520&q=70',
  },
];

const operationalStats = [
  { label: 'Catalog items', value: '4,281' },
  { label: 'Queue SLA', value: '99.4%' },
  { label: 'Moderators', value: '28' },
];

const platformPillars = [
  { icon: DatabaseZap, label: 'Catalog ops' },
  { icon: ShieldCheck, label: 'Rights review' },
  { icon: UsersRound, label: 'User trust' },
];

export function AuthPageShell({
  children,
  eyebrow = '35mm Studio',
  title = 'Operate the film platform with a cleaner control room.',
  description = 'Manage catalog ingestion, curation workflows, moderation queues, platform health, and admin access from one focused workspace.',
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]">
        <section className="relative flex min-h-[54rem] overflow-hidden border-b bg-[oklch(0.155_0.012_285)] text-white lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=75"
              alt="Film projection room"
              className="h-full w-full object-cover opacity-28"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,13,0.35),rgba(10,10,13,0.92))]" />
          </div>

          <div className="relative z-10 flex w-full flex-col justify-between gap-12 p-5 sm:p-8 lg:p-10">
            <header className="flex items-center justify-between gap-4">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-white text-black">
                  <Film className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">35mm Studio</span>
                  <span className="block text-xs text-white/58">Operations workspace</span>
                </span>
              </Link>
              <Link
                href="/dashboard"
                prefetch={false}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'border-white/16 bg-white/8 text-white hover:bg-white/14 hover:text-white',
                )}
              >
                Dashboard
              </Link>
            </header>

            <div className="max-w-2xl space-y-7">
              <div className="inline-flex items-center gap-2 rounded-[8px] border border-white/12 bg-white/8 px-3 py-1.5 text-xs text-white/76">
                <Activity className="size-3.5 text-emerald-300" />
                {eyebrow}
              </div>
              <div className="space-y-4">
                <h1 className="max-w-[14ch] text-5xl font-semibold leading-[0.95] sm:text-6xl xl:text-7xl">
                  {title}
                </h1>
                <p className="max-w-xl text-base leading-7 text-white/68 sm:text-lg">{description}</p>
              </div>
              <div className="grid max-w-xl grid-cols-3 gap-2">
                {operationalStats.map((stat) => (
                  <div key={stat.label} className="rounded-[8px] border border-white/10 bg-white/8 p-3">
                    <div className="text-xl font-semibold">{stat.value}</div>
                    <div className="mt-1 text-[11px] text-white/58">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1fr_0.74fr]">
              <div className="grid gap-3 sm:grid-cols-3">
                {posterTiles.map((tile) => (
                  <article key={tile.title} className="overflow-hidden rounded-[8px] border border-white/10 bg-white/8">
                    <img src={tile.src} alt="" className="h-32 w-full object-cover sm:h-40" />
                    <div className="space-y-1 p-3">
                      <h2 className="truncate text-sm font-medium">{tile.title}</h2>
                      <p className="truncate text-xs text-white/56">{tile.meta}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="grid content-end gap-2">
                {platformPillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.label}
                      className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-black/18 p-3 text-sm text-white/76"
                    >
                      <Icon className="size-4 text-amber-200" />
                      {pillar.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[30rem]">{children}</div>
        </section>
      </div>
    </main>
  );
}
