'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { filmFormSchema, type FilmFormValues } from '@/lib/schemas';
import { slugify } from '@/lib/utils';
import { useFilms } from '@/hooks/useFilms';

type ImportRow = {
  index: number;
  values: FilmFormValues | null;
  errors: string[];
};

const listFields = new Set(['originCountries', 'spokenLanguages', 'genres', 'contentWarnings']);
const numberFields = new Set(['startYear', 'endYear', 'runtimeMinutes']);
const booleanFields = new Set(['isAdult', 'isVerified']);

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((item) => item.some((value) => value.trim().length > 0));
}

function normalizeBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function normalizeRow(headers: string[], values: string[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    const key = header.trim();
    const raw = values[index]?.trim() ?? '';
    if (!key || raw.length === 0) return;
    if (listFields.has(key)) {
      output[key] = raw.split(/[;,]/u).map((item) => item.trim()).filter(Boolean);
      return;
    }
    if (numberFields.has(key)) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) output[key] = parsed;
      return;
    }
    if (booleanFields.has(key)) {
      output[key] = normalizeBoolean(raw);
      return;
    }
    output[key] = raw;
  });

  const title = String(output.title ?? '').trim();
  if (title) {
    output.sortTitle = String(output.sortTitle ?? title.toLowerCase()).trim();
    output.slug = String(output.slug ?? slugify(title)).trim();
  }
  output.type = output.type || 'movie';
  output.lifecycle = output.lifecycle || 'released';
  output.status = output.status || 'active';
  output.originCountries = output.originCountries || [];
  output.spokenLanguages = output.spokenLanguages || [];
  output.genres = output.genres || [];
  output.contentWarnings = output.contentWarnings || [];
  output.isAdult = Boolean(output.isAdult);
  output.isVerified = Boolean(output.isVerified);

  return output;
}

function parseImport(input: string): ImportRow[] {
  const rows = parseCsv(input);
  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  if (headers.length === 0) return [];

  return rows.slice(1).map((row, index) => {
    const normalized = normalizeRow(headers, row);
    const parsed = filmFormSchema.safeParse(normalized);
    if (!parsed.success) {
      return {
        index: index + 2,
        values: null,
        errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      };
    }
    return { index: index + 2, values: parsed.data, errors: [] };
  });
}

export default function ImportPage() {
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const { createFilmAsync } = useFilms({ search: '', type: null, year: null }, null, 25);

  const parsedRows = useMemo(() => parseImport(csv), [csv]);
  const validRows = parsedRows.filter((row) => row.values);
  const invalidRows = parsedRows.filter((row) => row.errors.length > 0);

  const runImport = async () => {
    if (validRows.length === 0 || invalidRows.length > 0) return;
    setImporting(true);
    try {
      for (const row of validRows) {
        if (!row.values) continue;
        await createFilmAsync(row.values);
      }
      toast.success(`${validRows.length} catalog title${validRows.length === 1 ? '' : 's'} imported`);
      setCsv('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Catalog import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell title="Import">
      <Card>
        <CardHeader>
          <CardTitle>Catalog CSV import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="min-h-72 font-mono text-xs"
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            placeholder="title,type,lifecycle,status,startYear,releaseDate,runtimeMinutes,genres,posterUrl,imdbId,tmdbId"
          />
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{validRows.length} valid</span>
            <span>{invalidRows.length} invalid</span>
          </div>
          {invalidRows.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {invalidRows.slice(0, 10).map((row) => (
                <p key={row.index}>Row {row.index}: {row.errors.join('; ')}</p>
              ))}
            </div>
          ) : null}
          <LoadingButton
            disabled={validRows.length === 0 || invalidRows.length > 0}
            isLoading={importing}
            loadingText={`Importing ${validRows.length}`}
            onClick={runImport}
          >
            Import valid rows
          </LoadingButton>
        </CardContent>
      </Card>
    </AppShell>
  );
}
