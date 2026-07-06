'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Plus, Table2, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { FilmCard } from '@/components/films/FilmCard';
import { FilmsTable } from '@/components/films/FilmsTable';
import { FilmFiltersPanel } from '@/components/films/FilmFilters';
import { useFilmFilters } from '@/stores/filmFilters';
import { useFilms } from '@/hooks/useFilms';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function FilmsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const search = useFilmFilters((state) => state.search);
  const types = useFilmFilters((state) => state.types);
  const genres = useFilmFilters((state) => state.genres);
  const yearMin = useFilmFilters((state) => state.yearMin);
  const yearMax = useFilmFilters((state) => state.yearMax);
  const hasPoster = useFilmFilters((state) => state.hasPoster);
  const filters = useMemo(
    () => ({
      search,
      types,
      genres,
      yearMin,
      yearMax,
      hasPoster,
    }),
    [search, types, genres, yearMin, yearMax, hasPoster],
  );
  const router = useRouter();

  const filmQuery = useFilms(filters, page, pageSize, 'dateAdded', 'desc');
  const isLoading = filmQuery.isLoading || filmQuery.isFetching;

  const films = filmQuery.data?.items || [];
  const total = filmQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSelect = (id: string, value: boolean) => {
    setSelectedIds((current) => {
      if (value) {
        return [...new Set([...current, id])];
      }
      return current.filter((item) => item !== id);
    });
  };

  return (
    <AppShell
      title="Films"
      actionSlot={
        <Link href="/films/new">
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            Add film
          </Button>
        </Link>
      }
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Films</h2>
        <p className="text-sm text-muted-foreground">
          {total} film{total !== 1 ? 's' : ''} in database
        </p>
      </div>

      <FilmFiltersPanel />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'grid')}>
          <TabsList className="h-8">
            <TabsTrigger value="table" className="gap-1.5 text-xs">
              <Table2 className="size-3.5" />
              Table
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1.5 text-xs">
              <LayoutGrid className="size-3.5" />
              Grid
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1.5"
              onClick={async () => {
                await filmQuery.bulkDeleteAsync(selectedIds);
                setSelectedIds([]);
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                const selected = films
                  .filter((film) => selectedIds.includes(film.id))
                  .map((film) => JSON.stringify(film));
                const payload = `[{\n${selected.join(',\n')}\n]`;
                const blob = new Blob([payload], { type: 'application/json' });
                const href = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = href;
                anchor.download = 'films-export.json';
                anchor.click();
                URL.revokeObjectURL(href);
              }}
            >
              Export JSON
            </Button>
          </div>
        ) : null}
      </div>

      {viewMode === 'grid' ? (
        isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {new Array(12).fill(0).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {films.length === 0 ? (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No films found.</p>
            ) : null}
            {films.map((film) => (
              <FilmCard
                key={film.id}
                film={film}
                onSelect={() => {
                  router.push(`/films/${film.id}/edit`);
                }}
              />
            ))}
          </div>
        )
      ) : null}

      {viewMode !== 'grid' ? (
        <FilmsTable
          films={films}
          isLoading={isLoading}
          selected={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={(value) => {
            setSelectedIds(value ? films.map((film) => film.id) : []);
          }}
          onEdit={(film) => {
            router.push(`/films/${film.id}/edit`);
          }}
          onDelete={async (film) => {
            await filmQuery.deleteFilmAsync(film.id);
          }}
          onView={(film) => {
            router.push(`/films/${film.id}`);
          }}
        />
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(Math.max(page - 1, 0))} disabled={page === 0}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPage(Math.min(page + 1, totalPages - 1))}
            disabled={(page + 1) * pageSize >= total}
          >
            Next
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
