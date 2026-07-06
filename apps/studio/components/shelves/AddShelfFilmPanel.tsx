'use client';

import { useMemo, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type Film } from '@/lib/types';
import { useFilms } from '@/hooks/useFilms';
import { useMediaQuery } from '@/components/layout/useMediaQuery';

interface AddShelfFilmPanelProps {
  onAdd: (film: Film) => void;
  existingFilmIds: string[];
}

export function AddShelfFilmPanel({ onAdd, existingFilmIds }: AddShelfFilmPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isMobile = useMediaQuery('(max-width: 767px)');

  const { data } = useFilms({ search: '', types: [], genres: [], yearMin: null, yearMax: null, hasPoster: null }, 0, 200);
  const films = data?.items || [];
  const addedSet = useMemo(() => new Set(existingFilmIds), [existingFilmIds]);

  const filtered = useMemo(
    () =>
      films.filter((film) =>
        [film.title, film.directors.map((person) => person.name).join(' ')].join(' ').toLowerCase().includes(search.toLowerCase()),
      ),
    [films, search],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" className="h-8 gap-1.5"><Plus className="size-3.5" />Add films</Button>} />
      <SheetContent side={isMobile ? 'bottom' : 'right'}>
        <h2 className="text-lg font-semibold">Add films</h2>
        <div className="mt-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search films" />
          <div className="mt-3 space-y-2">
            {filtered.slice(0, 40).map((film) => {
              const alreadyAdded = addedSet.has(film.id);
              return (
                <div key={film.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <span className="truncate text-sm font-medium">{film.title}</span>
                  <Button
                    size="sm"
                    className="h-7 shrink-0"
                    onClick={() => {
                      if (!alreadyAdded) {
                        onAdd(film);
                        setOpen(false);
                      }
                    }}
                    variant={alreadyAdded ? 'outline' : 'default'}
                    disabled={alreadyAdded}
                  >
                    {alreadyAdded ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="size-3.5" />
                        Added
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Plus className="size-3.5" />
                        Add
                      </span>
                    )}
                  </Button>
                </div>
              );
            })}
            {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No results.</p> : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
