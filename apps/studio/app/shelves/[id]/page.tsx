'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ShelfEditor } from '@/components/shelves/ShelfEditor';
import { useShelvesQuery } from '@/hooks/useShelves';
import { useRouter } from 'next/navigation';

export default function ShelfPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const { data: shelves } = useShelvesQuery();
  const router = useRouter();

  const shelf = shelves?.find((entry) => entry.id === id);

  if (!shelf) {
    return (
      <AppShell title="Shelf editor">
        <p className="text-sm">Loading shelf…</p>
      </AppShell>
    );
  }

  return (
      <AppShell title={shelf.name}>
        <ShelfEditor
          shelf={shelf}
          onBack={() => {
            router.push('/shelves');
          }}
        />
      </AppShell>
  );
}
