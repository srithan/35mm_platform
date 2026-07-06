'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateLabel } from '@/lib/utils';
import { type Film } from '@/lib/types';

export function FilmsTable({
  films,
  onEdit,
  onDelete,
  onView,
  selected,
  onToggleSelect,
  onSelectAll,
  isLoading = false,
}: {
  films: Film[];
  onEdit: (film: Film) => void;
  onDelete: (film: Film) => void;
  onView: (film: Film) => void;
  selected: string[];
  onToggleSelect: (id: string, value: boolean) => void;
  onSelectAll: (value: boolean) => void;
  isLoading?: boolean;
}) {
  const columns: ColumnDef<Film>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={selected.length === films.length && films.length > 0}
          onCheckedChange={(checked) => onSelectAll(!!checked)}
          aria-label="Select all films"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selected.includes(row.original.id)}
          onCheckedChange={(checked) => onToggleSelect(row.original.id, !!checked)}
          aria-label={`Select ${row.original.title}`}
        />
      ),
    },
    {
      accessorKey: 'posterUrl',
      header: 'Poster',
      cell: ({ row }) => {
        const url = row.original.posterUrl;
        return (
          <div className="size-12 overflow-hidden rounded-md bg-muted">
            {url ? (
              <Image src={url} width={48} height={72} alt={row.original.title} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">—</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link href={`/films/${row.original.id}`} className="font-medium hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'releaseYear',
      header: 'Year',
      enableSorting: true,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
    },
    {
      id: 'directors',
      header: 'Directors',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.directors.map((person) => person.name).join(', ') || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'runtimeMinutes',
      header: 'Runtime',
      enableSorting: true,
      cell: ({ getValue }) => (getValue() ? `${getValue()}m` : '—'),
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ getValue }) => <Badge variant="outline">{String(getValue())}</Badge>,
    },
    {
      accessorKey: 'dateAdded',
      header: 'Added',
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatDateLabel(getValue() as string)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(row.original)}>
              <Eye className="size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const [sorting, setSorting] = useState<SortingState>([{ id: 'dateAdded', desc: true }]);

  const table = useReactTable({
    data: films,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {new Array(8).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs font-medium text-muted-foreground">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No films found.
              </TableCell>
            </TableRow>
          ) : null}
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={selected.includes(row.original.id) ? 'selected' : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
