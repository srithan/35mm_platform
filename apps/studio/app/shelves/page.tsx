'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ShelfList } from '@/components/shelves/ShelfList';
import { useShelvesQuery } from '@/hooks/useShelves';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export default function ShelvesPage() {
  const { data: shelves, deleteShelfAsync } = useShelvesQuery();
  const router = useRouter();

  const safeShelves = shelves || [];

  return (
    <AppShell
      title="Shelves"
      actionSlot={
        <Link href="/shelves/new">
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="size-3.5" />
            New shelf
          </Button>
        </Link>
      }
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Shelves</h2>
        <p className="text-sm text-muted-foreground">
          {safeShelves.length} shelf{safeShelves.length !== 1 ? 'es' : ''} configured
        </p>
      </div>
      <ShelfList
        shelves={safeShelves}
        onDuplicate={(shelf) => {
          router.push(`/shelves/new?from=${shelf.id}`);
        }}
        onDelete={(shelf) => {
          void deleteShelfAsync(shelf.id);
        }}
      />
    </AppShell>
  );
}
