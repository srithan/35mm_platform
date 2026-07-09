'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Film } from '@/lib/types';
import { useFilms } from '@/hooks/useFilms';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { cn } from '@/lib/utils';

interface AddShelfFilmPanelProps {
  onAdd: (film: Film) => void;
  existingFilmIds: string[];
}

export function AddShelfFilmPanel({ onAdd, existingFilmIds }: AddShelfFilmPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const { data, isFetching } = useFilms({ search, type: null, year: null }, null, 50);
  const films = data?.items || [];
  const addedSet = useMemo(() => new Set(existingFilmIds), [existingFilmIds]);

  const visibleFilms = useMemo(
    () =>
      films
        .filter((film) => film.title.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 30),
    [films, search],
  );

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
    resultRefs.current = [];
  }, [search, visibleFilms.length]);

  const addFilm = (film: Film) => {
    if (addedSet.has(film.id)) return;
    onAdd(film);
    setSearch('');
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const focusResult = (index: number) => {
    if (visibleFilms.length === 0) return;
    const bounded = Math.max(0, Math.min(index, visibleFilms.length - 1));
    setActiveIndex(bounded);
    resultRefs.current[bounded]?.focus();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const film = visibleFilms[activeIndex] ?? visibleFilms[0];
      if (film) addFilm(film);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusResult(activeIndex);
    }
  };

  const onResultsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (visibleFilms.length === 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusResult((activeIndex + 1) % visibleFilms.length);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusResult((activeIndex - 1 + visibleFilms.length) % visibleFilms.length);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" className="h-8 gap-1.5"><Plus className="size-3.5" />Add films</Button>} />
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'max-h-[82vh]' : 'sm:max-w-xl'}>
        <SheetHeader className="border-b px-4 pb-3">
          <SheetTitle>Add films</SheetTitle>
          <SheetDescription>Search, press Enter to add, keep typing.</SheetDescription>
        </SheetHeader>

        <div className="grid gap-3 px-4 pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search films"
              className="h-10 pl-8"
            />
            {isFetching ? (
              <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div
            className="-mx-1 overflow-x-auto px-1 pb-2"
            role="listbox"
            aria-label="Shelf film search results"
            onKeyDown={onResultsKeyDown}
          >
            <div className="flex w-max gap-2">
              {visibleFilms.map((film, index) => {
                const alreadyAdded = addedSet.has(film.id);
                return (
                  <button
                    key={film.id}
                    ref={(node) => {
                      resultRefs.current[index] = node;
                    }}
                    type="button"
                    onClick={() => addFilm(film)}
                    onFocus={() => setActiveIndex(index)}
                    disabled={alreadyAdded}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={cn(
                      'w-28 shrink-0 rounded-lg border bg-card p-1.5 text-left transition-colors hover:border-primary hover:shadow-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
                      activeIndex === index ? 'border-primary/70 bg-primary/5' : null,
                    )}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
                      {film.posterUrl ? (
                        <Image src={film.posterUrl} alt={film.title} fill className="object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                          No poster
                        </div>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-8 text-xs font-medium leading-tight">{film.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{film.releaseYear ?? '—'} · {film.type}</p>
                    <Badge variant={alreadyAdded ? 'secondary' : 'outline'} className="mt-1.5 h-5 rounded-md text-[11px]">
                      {alreadyAdded ? <Check className="size-3" /> : <Plus className="size-3" />}
                      {alreadyAdded ? 'Added' : 'Add'}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
          {visibleFilms.length === 0 ? <p className="text-sm text-muted-foreground">No results.</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
