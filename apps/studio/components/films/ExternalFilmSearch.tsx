'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { ExternalSourceName, type ExternalSearchResult } from '@/lib/data/externalSource';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, Search, Wand2 } from 'lucide-react';

export function ExternalFilmSearch({
  onSelect,
}: {
  onSelect: (film: Record<string, unknown>) => void;
}) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<ExternalSourceName>('TMDB');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchMutation = useExternalSearch();
  const detailsMutation = useExternalDetails();
  const results = searchMutation.data ?? [];
  const isSearching = searchMutation.isPending;
  const isImporting = detailsMutation.isPending;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    resultRefs.current = [];
  }, [results.length]);

  const runSearch = () => {
    const clean = query.trim();
    if (!clean || isSearching) return;
    searchMutation.mutate({ source, query: clean });
  };

  const importResult = async (result: ExternalSearchResult) => {
    const details = await detailsMutation.mutateAsync(result);
    onSelect(details as Record<string, unknown>);
  };

  const focusResult = (index: number) => {
    const bounded = Math.max(0, Math.min(index, results.length - 1));
    setActiveIndex(bounded);
    resultRefs.current[bounded]?.focus();
  };

  const onResultsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusResult((activeIndex + 1) % results.length);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusResult((activeIndex - 1 + results.length) % results.length);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusResult(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusResult(results.length - 1);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  return (
    <Card className="border-primary/15 bg-gradient-to-b from-background to-muted/20">
      <CardHeader className="gap-2 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wand2 className="size-4 text-primary" />
            Fast lookup
          </CardTitle>
          <CardDescription>Type a title or paste an IMDb ID to autofill catalog data.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row">
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                runSearch();
              }
              if (event.key === 'ArrowDown' && results.length > 0) {
                event.preventDefault();
                focusResult(activeIndex);
              }
            }}
            placeholder="Search title or paste IMDb ID"
            className="h-10 flex-1 text-base md:text-sm"
            aria-label="Search external film sources"
          />
          <Select value={source} onValueChange={(value) => setSource(value as ExternalSourceName)}>
            <SelectTrigger className="h-10 w-full lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TMDB">TMDB</SelectItem>
              <SelectItem value="OMDb">OMDb</SelectItem>
              <SelectItem value="IMDb ID">IMDb ID</SelectItem>
              <SelectItem value="Open Library">Open Library</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={runSearch}
            disabled={isSearching || query.trim().length === 0}
            className="h-10 gap-1.5"
          >
            {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {isSearching ? 'Searching' : 'Search'}
          </Button>
        </div>

        {searchMutation.isError ? (
          <p className="text-sm text-destructive">{String(searchMutation.error?.message || 'Search failed')}</p>
        ) : null}
        {detailsMutation.isError ? (
          <p className="text-sm text-destructive">{String(detailsMutation.error?.message || 'Details lookup failed')}</p>
        ) : null}

        {results.length > 0 ? (
          <div
            className="-mx-1 overflow-x-auto px-1 pb-1"
            role="listbox"
            aria-label="External film results"
            onKeyDown={onResultsKeyDown}
          >
            <div className="flex w-max gap-2">
              {results.map((result, index) => (
                <button
                  key={`${result.source}-${result.id}`}
                  ref={(node) => {
                    resultRefs.current[index] = node;
                  }}
                  type="button"
                  onClick={async () => {
                    await importResult(result);
                  }}
                  onFocus={() => setActiveIndex(index)}
                  disabled={isImporting}
                  className={cn(
                    'group w-28 shrink-0 rounded-lg border bg-card p-1.5 text-left transition-colors hover:border-primary hover:shadow-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
                    activeIndex === index ? 'border-primary/70 bg-primary/5' : null,
                  )}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
                    {result.poster ? (
                      <Image src={result.poster} alt={result.title} fill className="object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="mt-2 min-w-0">
                    <p className="line-clamp-2 min-h-8 text-xs font-medium leading-tight">{result.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {result.year ?? 'Unknown'} · {result.type}
                    </p>
                  </div>
                  <Badge variant="outline" className="mt-1.5 h-5 rounded-md text-[11px]">
                    {index === activeIndex && isImporting ? <Loader2 className="size-3 animate-spin" /> : 'Import'}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
