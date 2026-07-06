'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ExternalSourceName } from '@/lib/data/externalSource';
import { useExternalSearch, useExternalDetails } from '@/hooks/useExternalSource';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';

export function ExternalFilmSearch({
  onSelect,
}: {
  onSelect: (film: Record<string, unknown>) => void;
}) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<ExternalSourceName>('TMDB');
  const searchMutation = useExternalSearch();
  const detailsMutation = useExternalDetails();

  return (
    <Card>
      <CardHeader>
        <CardTitle>External source lookup</CardTitle>
        <CardDescription>Search TMDB, OMDb, IMDb ID, or Open Library to autofill film data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={source} onValueChange={(value) => setSource(value as ExternalSourceName)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TMDB">TMDB</SelectItem>
              <SelectItem value="OMDb">OMDb</SelectItem>
              <SelectItem value="IMDb ID">IMDb ID</SelectItem>
              <SelectItem value="Open Library">Open Library</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or paste IMDb ID"
            className="flex-1"
          />
          <Button
            onClick={() => searchMutation.mutate({ source, query })}
            disabled={searchMutation.isPending}
            className="gap-1.5"
          >
            <Search className="size-4" />
            Search
          </Button>
        </div>

        {searchMutation.isError ? (
          <p className="text-sm text-destructive">{String(searchMutation.error?.message || 'Search failed')}</p>
        ) : null}
        {detailsMutation.isError ? (
          <p className="text-sm text-destructive">{String(detailsMutation.error?.message || 'Details lookup failed')}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {searchMutation.data?.map((result) => (
            <button
              key={`${result.source}-${result.id}`}
              type="button"
              onClick={async () => {
                const details = await detailsMutation.mutateAsync(result);
                onSelect(details as Record<string, unknown>);
              }}
              className="group rounded-lg border bg-card p-2 text-left transition-colors hover:border-primary hover:shadow-sm"
            >
              <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded-md bg-muted">
                {result.poster ? (
                  <Image src={result.poster} alt={result.title} fill className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">No image</div>
                )}
              </div>
              <p className="truncate text-sm font-medium">{result.title}</p>
              <p className="text-xs text-muted-foreground">
                {result.year ?? '—'} · {result.type}
              </p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
