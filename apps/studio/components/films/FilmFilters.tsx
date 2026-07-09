'use client';

import { FILM_TYPES, type FilmType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFilmFilters } from '@/stores/filmFilters';
import { X } from 'lucide-react';

const ALL_TYPES_VALUE = '__all_types__';

export function FilmFiltersPanel() {
  const {
    search,
    type,
    year,
    setSearch,
    setType,
    setYear,
  } = useFilmFilters((state) => state);

  const normalizeYear = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const hasFilters = search.trim().length > 0 || type !== null || year !== null;

  return (
    <Card className="w-full">
      <CardContent className="grid gap-3 pt-4 md:grid-cols-[minmax(220px,1fr)_180px_140px_auto]">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            placeholder="Title prefix"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={type ?? ALL_TYPES_VALUE}
            onValueChange={(value) => setType(value === ALL_TYPES_VALUE ? null : (value as FilmType))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES_VALUE}>All types</SelectItem>
              {FILM_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Input
            type="number"
            min={1800}
            max={2300}
            inputMode="numeric"
            placeholder="Any"
            value={year ?? ''}
            onChange={(event) => setYear(normalizeYear(event.target.value))}
            className="h-8"
          />
        </div>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="self-end text-muted-foreground"
            onClick={() => {
              setSearch('');
              setType(null);
              setYear(null);
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
