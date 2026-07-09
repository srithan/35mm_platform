'use client';

import { useState } from 'react';
import { type Shelf } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { formatDateLabel } from '@/lib/utils';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Copy, Pencil, Trash2 } from 'lucide-react';

export function ShelfList({
  shelves,
  onDuplicate,
  onDelete,
}: {
  shelves: Shelf[];
  onDuplicate: (shelf: Shelf) => void;
  onDelete: (shelf: Shelf) => Promise<void> | void;
}) {
  const [openDeleteId, setOpenDeleteId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const activeCount = shelves.filter((shelf) => shelf.visibility === 'active').length;
  const draftCount = shelves.length - activeCount;
  const totalFilms = shelves.reduce((sum, shelf) => sum + shelf.filmIds.length, 0);

  const handleDelete = async (shelf: Shelf) => {
    setPendingDeleteId(shelf.id);
    try {
      await onDelete(shelf);
      setOpenDeleteId(null);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-6xl overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="rounded-md">{shelves.length} shelves</Badge>
            <span>{activeCount} active</span>
            <span>{draftCount} draft</span>
            <span>{totalFilms} films</span>
          </div>
          <p className="text-xs text-muted-foreground">Edit shelf order and publishing state</p>
        </div>

        {shelves.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No shelves configured yet.</p>
        ) : (
          <div className="divide-y">
            {shelves.map((shelf) => (
              <div key={shelf.id} className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/shelves/${shelf.id}`} className="truncate text-base font-semibold hover:underline">
                    {shelf.displayName}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{shelf.internalName}</span>
                    <span>{formatDateLabel(shelf.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2 lg:w-56">
                  <Badge variant="secondary" className="rounded-md">{shelf.type}</Badge>
                  <Badge variant={shelf.visibility === 'active' ? 'default' : 'outline'} className="rounded-md">
                    {shelf.visibility}
                  </Badge>
                </div>

                <div className="w-full text-sm lg:w-40">
                  <span className="font-medium">{shelf.filmIds.length}</span>
                  <span className="text-muted-foreground"> / {shelf.maxFilms} films</span>
                </div>

                <div className="flex justify-start gap-1 lg:justify-end">
                  <Link href={`/shelves/${shelf.id}`}>
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => onDuplicate(shelf)}>
                    <Copy className="size-3.5" />
                    Duplicate
                  </Button>
                  <AlertDialog open={openDeleteId === shelf.id} onOpenChange={(open) => setOpenDeleteId(open ? shelf.id : null)}>
                    <AlertDialogTrigger
                      render={
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-destructive hover:bg-destructive/10"
                          disabled={pendingDeleteId === shelf.id}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete shelf</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete <strong>{shelf.displayName}</strong>? This removes the shelf and all film ordering.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          render={<Button variant="outline" type="button" disabled={pendingDeleteId === shelf.id}>Cancel</Button>}
                        />
                        <LoadingButton
                          variant="destructive"
                          onClick={() => void handleDelete(shelf)}
                          isLoading={pendingDeleteId === shelf.id}
                          loadingText="Deleting"
                          type="button"
                        >
                          <Trash2 className="size-4" />
                          Delete shelf
                        </LoadingButton>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
