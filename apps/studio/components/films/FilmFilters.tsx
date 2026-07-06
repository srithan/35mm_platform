'use client';

import { FILM_TYPES } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useFilmFilters } from '@/stores/filmFilters';
import { useMemo } from 'react';
import { type FilmType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const genreOptions = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
  'Other',
];

export function FilmFiltersPanel() {
  const {
    search,
    types,
    genres,
    yearMin,
    yearMax,
    hasPoster,
    setSearch,
    setTypes,
    setGenres,
    setYearRange,
    setHasPoster,
  } = useFilmFilters((state) => state);

  const yearBounds = useMemo(() => {
    const current = new Date().getFullYear();
    return { min: 1888, max: current + 5 };
  }, []);

  const toggleType = (value: FilmType) => {
    setTypes(types.includes(value) ? types.filter((entry) => entry !== value) : [...types, value]);
  };

  const toggleGenre = (value: string) => {
    setGenres(genres.includes(value) ? genres.filter((entry) => entry !== value) : [...genres, value]);
  };

  const normalizeYear = (value: string) => {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  };

  const activeFilterCount =
    types.length + genres.length + (yearMin !== null && yearMin !== undefined ? 1 : 0) + (yearMax !== null && yearMax !== undefined ? 1 : 0) + (hasPoster !== null ? 1 : 0);

  return (
    <Card className="w-full">
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              placeholder="Title, director, or IMDb ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Poster</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={hasPoster === true}
                  onCheckedChange={(checked) => setHasPoster(checked ? true : null)}
                />
                Yes
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={hasPoster === false}
                  onCheckedChange={(checked) => setHasPoster(checked ? false : null)}
                />
                No
              </label>
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground"
              onClick={() => {
                setSearch('');
                setTypes([]);
                setGenres([]);
                setYearRange(null, null);
                setHasPoster(null);
              }}
            >
              <X className="size-3.5" />
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <div className="flex flex-wrap gap-1.5">
            {FILM_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  types.includes(type)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Genre</Label>
          <div className="flex flex-wrap gap-1.5">
            {genreOptions.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  genres.includes(genre)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Release year</Label>
            <Badge variant="outline" className="text-[10px] font-normal">
              {yearMin ?? 'Any'} – {yearMax ?? 'Any'}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">From</Label>
              <Input
                type="number"
                min={yearBounds.min}
                max={yearBounds.max}
                inputMode="numeric"
                placeholder="Any"
                value={yearMin ?? ''}
                onChange={(event) => setYearRange(normalizeYear(event.target.value), yearMax)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">To</Label>
              <Input
                type="number"
                min={yearBounds.min}
                max={yearBounds.max}
                inputMode="numeric"
                placeholder="Any"
                value={yearMax ?? ''}
                onChange={(event) => setYearRange(yearMin, normalizeYear(event.target.value))}
                className="h-8"
              />
            </div>
            {(yearMin !== null && yearMin !== undefined) || (yearMax !== null && yearMax !== undefined) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-end text-muted-foreground"
                onClick={() => setYearRange(null, null)}
              >
                Reset
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
