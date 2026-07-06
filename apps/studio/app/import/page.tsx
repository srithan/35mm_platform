'use client';

import { type DragEvent, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFilms } from '@/hooks/useFilms';
import { filmFormSchema, type FilmFormValues } from '@/lib/schemas';
import { toast } from 'sonner';
import { type ZodIssue } from 'zod';

type ImportMode = 'json' | 'csv';
type ImportedRow = {
  index: number;
  row: FilmFormValues;
  valid: boolean;
  errors: ZodIssue[];
};

type CsvMapValue = keyof FilmFormValues | '__ignore';

const csvFieldOptions: CsvMapValue[] = [
  '__ignore',
  'title',
  'originalTitle',
  'slug',
  'type',
  'status',
  'imdbId',
  'tmdbId',
  'releaseYear',
  'releaseDate',
  'runtimeMinutes',
  'seasonCount',
  'episodeCount',
  'episodeRuntimeMinutes',
  'tagline',
  'shortDescription',
  'synopsis',
  'posterUrl',
  'backdropUrl',
  'trailerUrl',
  'genres',
  'languages',
  'countries',
  'directors',
  'writers',
  'cast',
  'studios',
  'images',
  'tags',
  'contentWarnings',
  'isShortFilm',
  'featured',
  'adminNotes',
];

const schemaShape = `{
  title: string;
  originalTitle?: string;
  slug?: string;
  type: 'feature' | 'short' | 'documentary' | 'tv-show' | 'web-series' | 'mini-series' | 'special' | 'anthology';
  status: 'released' | 'in-production' | 'post-production' | 'announced' | 'cancelled';
  imdbId?: string;
  tmdbId?: number;
  releaseYear?: number;
  releaseDate?: string;
  runtimeMinutes?: number;
  seasonCount?: number;
  episodeCount?: number;
  episodeRuntimeMinutes?: number;
  tagline?: string;
  shortDescription?: string;
  synopsis?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  genres: string[];
  languages: string[];
  countries: string[];
  directors: { name: string; personId?: string }[];
  writers: { name: string; personId?: string }[];
  cast: { name: string; character?: string; personId?: string; billingOrder?: number }[];
  studios: string[];
  images: string[];
  tags: string[];
  contentWarnings?: string[];
  isShortFilm?: boolean;
  featured?: boolean;
  adminNotes?: string;
}`;

function splitList(raw?: string): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'number') {
    return raw === 1;
  }
  const value = String(raw || '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'y';
}

function toNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  const value = Number.parseInt(String(raw).trim(), 10);
  return Number.isNaN(value) ? undefined : value;
}

function normalizeImportRow(row: Record<string, unknown>): FilmFormValues {
  const normalizePeople = (raw: unknown) => {
    if (!raw) {
      return [];
    }
    if (Array.isArray(raw)) {
      return raw
        .map((entry) => {
          if (typeof entry === 'string') {
            return { name: entry.trim() };
          }
          if (entry && typeof entry === 'object') {
            const value = entry as Record<string, string>;
            return {
              name: String(value.name || '').trim(),
              personId: String(value.personId || '').trim() || undefined,
              character: String(value.character || '').trim() || undefined,
              billingOrder: toNumber(value.billingOrder),
            };
          }
          return { name: '' };
        })
        .filter((entry) => entry.name);
    }
    return splitList(String(raw)).map((name) => ({ name }));
  };

  const title = String(row.title || '').trim();
  const rawSlug = String(row.slug || '').trim();

  return {
    title,
    originalTitle: String(row.originalTitle || '').trim(),
    slug: rawSlug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').slice(0, 100),
    type: (row.type as FilmFormValues['type']) || 'feature',
    status: (row.status as FilmFormValues['status']) || 'released',
    imdbId: String(row.imdbId || '').trim(),
    tmdbId: toNumber(row.tmdbId),
    releaseYear: toNumber(row.releaseYear),
    releaseDate: row.releaseDate ? String(row.releaseDate) : '',
    runtimeMinutes: toNumber(row.runtimeMinutes),
    seasonCount: toNumber(row.seasonCount),
    episodeCount: toNumber(row.episodeCount),
    episodeRuntimeMinutes: toNumber(row.episodeRuntimeMinutes),
    tagline: String(row.tagline || '').trim(),
    shortDescription: String(row.shortDescription || '').trim(),
    synopsis: String(row.synopsis || '').trim(),
    posterUrl: String(row.posterUrl || '').trim(),
    backdropUrl: String(row.backdropUrl || '').trim(),
    trailerUrl: String(row.trailerUrl || '').trim(),
    genres: splitList(typeof row.genres === 'string' ? String(row.genres) : Array.isArray(row.genres) ? row.genres.join(',') : ''),
    languages: splitList(typeof row.languages === 'string' ? String(row.languages) : Array.isArray(row.languages) ? row.languages.join(',') : ''),
    countries: splitList(typeof row.countries === 'string' ? String(row.countries) : Array.isArray(row.countries) ? row.countries.join(',') : ''),
    directors: normalizePeople(row.directors),
    writers: normalizePeople(row.writers),
    cast: normalizePeople(row.cast),
    studios: splitList(typeof row.studios === 'string' ? String(row.studios) : Array.isArray(row.studios) ? row.studios.join(',') : ''),
    images: splitList(typeof row.images === 'string' ? String(row.images) : Array.isArray(row.images) ? row.images.join(',') : ''),
    tags: splitList(typeof row.tags === 'string' ? String(row.tags) : Array.isArray(row.tags) ? row.tags.join(',') : ''),
    contentWarnings: splitList(typeof row.contentWarnings === 'string' ? String(row.contentWarnings) : Array.isArray(row.contentWarnings) ? row.contentWarnings.join(',') : '') as FilmFormValues['contentWarnings'],
    isShortFilm: normalizeBoolean(row.isShortFilm),
    featured: normalizeBoolean(row.featured),
    adminNotes: String(row.adminNotes || '').trim(),
  };
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(value);
      if (row.some((entry) => entry.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim().length > 0));
}

function mapper(payload: Record<string, unknown>, map: Record<string, CsvMapValue>): { row: FilmFormValues; errors: ZodIssue[]; valid: boolean } {
  const mapped: Record<string, unknown> = {};

  Object.entries(map).forEach(([header, field]) => {
    if (field === '__ignore') {
      return;
    }
    mapped[field] = payload[header];
  });

  const normalized = normalizeImportRow(mapped);
  const parsed = filmFormSchema.safeParse(normalized);
  if (!parsed.success) {
    return { row: normalized, valid: false, errors: parsed.error.issues };
  }
  return { row: parsed.data, valid: true, errors: [] };
}

export default function ImportPage() {
  const { createFilmAsync } = useFilms(
    {
      search: '',
      types: [],
      genres: [],
      yearMin: null,
      yearMax: null,
      hasPoster: null,
    },
    0,
    25,
  );

  const [mode, setMode] = useState<ImportMode>('json');
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, CsvMapValue>>({});
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const csvRows = useMemo(() => parseCsv(raw), [raw]);
  const csvHeaders = mode === 'csv' ? (csvRows[0] || []) : [];
  const bodyRows = mode === 'csv' ? csvRows.slice(1) : [];

  const validRows = useMemo(() => rows.filter((entry) => entry.valid), [rows]);
  const invalidRows = useMemo(() => rows.filter((entry) => !entry.valid), [rows]);

  const errorRows = useMemo(() => invalidRows.slice(0, 20), [invalidRows]);

  const autoMapCsv = (headers: string[]) => {
    const defaults: Record<string, CsvMapValue> = {};
    const suggestions: Record<string, CsvMapValue> = {
      title: 'title',
      name: 'title',
      originaltitle: 'originalTitle',
      slug: 'slug',
      type: 'type',
      status: 'status',
      imdbid: 'imdbId',
      tmdbid: 'tmdbId',
      year: 'releaseYear',
      runtime: 'runtimeMinutes',
      runtimeMinutes: 'runtimeMinutes',
      releaseyear: 'releaseYear',
      tagline: 'tagline',
      shortdescription: 'shortDescription',
      synopsis: 'synopsis',
      genres: 'genres',
      languages: 'languages',
      countries: 'countries',
      studios: 'studios',
      directors: 'directors',
      writers: 'writers',
      cast: 'cast',
      tags: 'tags',
      "content warnings": 'contentWarnings',
      featured: 'featured',
      "is short film": 'isShortFilm',
      'isshortfilm': 'isShortFilm',
    };

    headers.forEach((header, index) => {
      const normalized = String(header || '').trim().toLowerCase();
      defaults[header] = (suggestions[normalized] || defaultFieldForIndex(index)) as CsvMapValue;
    });
    setMapping(defaults);
  };

  const defaultFieldForIndex = (index: number): CsvMapValue => {
    const fallback = ['title', 'originalTitle', 'slug', 'type', 'status'];
    return (fallback[index] as CsvMapValue) || '__ignore';
  };

  const parseAndValidate = async () => {
    if (!raw.trim()) {
      toast.error('No content to parse');
      return;
    }

    try {
      if (mode === 'json') {
        const data = JSON.parse(raw) as unknown;
        if (!Array.isArray(data)) {
          toast.error('JSON import expects a top-level array');
          return;
        }

        const parsed = data.map((entry, index) => {
          const normalized = normalizeImportRow(entry as Record<string, unknown>);
          const validation = filmFormSchema.safeParse(normalized);
          return {
            index,
            row: validation.success ? (validation.data as FilmFormValues) : (normalized as FilmFormValues),
            valid: validation.success,
            errors: validation.success ? [] : validation.error.issues,
          };
        });
        setRows(parsed);
        return;
      }

      if (csvRows.length < 2) {
        toast.error('CSV import requires a header row and one row of data');
        return;
      }

      const parsed = bodyRows.map((record, index) => {
        const payload = record.reduce<Record<string, unknown>>((acc, value, column) => {
          const header = csvHeaders[column];
          if (header) {
            acc[String(header)] = value;
          }
          return acc;
        }, {});
        const result = mapper(payload, mapping);
        return {
          index,
          row: result.row,
          valid: result.valid,
          errors: result.errors,
        };
      });

      setRows(parsed);
    } catch {
      toast.error('Could not parse import payload');
    }
  };

  const onDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    const payload = await file.text();
    setRaw(payload);
    if (mode === 'csv') {
      autoMapCsv(parseCsv(payload)[0] || []);
    }
    toast.success(`Loaded ${file.name}`);
  };

  const onImport = async () => {
    if (validRows.length === 0) {
      return;
    }

    setIsImporting(true);
    let done = 0;
    for (let i = 0; i < validRows.length; i += 1) {
      const entry = validRows[i];
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
      await new Promise((resolve) => setTimeout(resolve, 80));
      await createFilmAsync({ ...entry.row, source: 'manual' });
      done += 1;
    }
    setIsImporting(false);
    setProgress(0);
    toast.success(`${done} films imported, ${invalidRows.length} skipped (validation errors)`);
  };

  return (
    <AppShell title="Import">
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Import source</h2>
          <div className="flex gap-2">
            <Button variant={mode === 'json' ? 'default' : 'outline'} onClick={() => setMode('json')}>
              JSON
            </Button>
            <Button variant={mode === 'csv' ? 'default' : 'outline'} onClick={() => setMode('csv')}>
              CSV
            </Button>
          </div>
          <label
            className="block rounded border border-dashed border p-6 text-center text-sm text-muted-foreground hover:border-primary"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            Drag and drop a {mode.toUpperCase()} file, or click below to upload
          </label>
          <Input
            type="file"
            accept={mode === 'json' ? 'application/json' : 'text/csv'}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              const payload = await file.text();
              setRaw(payload);
              if (mode === 'csv') {
                autoMapCsv(parseCsv(payload)[0] || []);
              }
              toast.success(`Loaded ${file.name}`);
            }}
          />
          <textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            className="min-h-36 w-full rounded border border bg-card p-2"
            placeholder="Paste JSON or CSV rows here"
          />
          <Button onClick={parseAndValidate}>Parse and validate</Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Expected schema</h2>
          <p className="text-sm text-muted-foreground">The import payload is validated with the film form schema.</p>
          <pre className="max-h-40 overflow-auto rounded border border bg-card p-2 text-xs">{schemaShape}</pre>
          <p className="text-sm text-muted-foreground">
            Valid rows: {validRows.length}, Invalid rows: {invalidRows.length}
          </p>
        </Card>

        {mode === 'csv' && csvHeaders.length > 0 ? (
          <Card className="p-4 space-y-2">
            <h2 className="text-sm font-semibold">CSV field mapping</h2>
            <p className="text-xs text-muted-foreground">Map each uploaded column to a film field.</p>
            <div className="grid gap-2 md:grid-cols-2">
              {csvHeaders.map((header) => (
                <div key={header} className="grid grid-cols-2 items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{header || '(empty)'}</span>
                  <select
                    className="rounded border border bg-card px-2 py-1"
                    value={mapping[header] || '__ignore'}
                    onChange={(event) => {
                      setMapping((current) => ({
                        ...current,
                        [header]: event.target.value as CsvMapValue,
                      }));
                    }}
                  >
                    {csvFieldOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Validation preview</h2>
          <div className="max-h-72 overflow-auto rounded border border">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Row</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-3 text-sm text-muted-foreground">
                      Parse the file to see row-level validation details.
                    </td>
                  </tr>
                ) : null}
                {rows.map((entry) => (
                  <tr key={entry.index} className="border-t border">
                    <td className="px-2 py-2">{entry.index + 1}</td>
                    <td className="px-2 py-2">
                      <span className={entry.valid ? 'text-green-600' : 'text-red-600'}>
                        {entry.valid ? 'Valid' : 'Invalid'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {entry.valid ? '—' : entry.errors.map((issue) => issue.message).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="text-sm text-muted-foreground">
            <summary>Expandable error details</summary>
            <div className="mt-2 space-y-2">
              {errorRows.map((entry) => (
                <p key={`${entry.index}-${entry.errors[0]?.message || 'err'}`}>Row {entry.index + 1}: {entry.errors.map((issue) => issue.message).join(', ')}</p>
              ))}
              {invalidRows.length > 20 ? <p>...and {invalidRows.length - 20} more invalid rows</p> : null}
            </div>
          </details>

          {isImporting ? (
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
              <div className="h-2 rounded bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : null}

          <Button disabled={validRows.length === 0 || isImporting} onClick={onImport}>
            {isImporting ? 'Importing…' : `Import ${validRows.length} valid films`}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
