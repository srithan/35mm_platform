'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ShelfEditor } from '@/components/shelves/ShelfEditor';
import { useShelvesQuery } from '@/hooks/useShelves';
import { useSearchParams, useRouter } from 'next/navigation';

const emptyShelf = {
  id: '',
  name: 'New Shelf',
  displayName: 'New Shelf',
  internalName: 'new-shelf',
  description: '',
  type: 'editorial' as const,
  visibility: 'draft' as const,
  maxFilms: 25,
  refreshCadence: 'manual' as const,
  filmIds: [],
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

export default function NewShelfPageClient() {
  const shelves = useShelvesQuery();
  const params = useSearchParams();
  const from = params.get('from');
  const router = useRouter();

  const shelfToClone = from ? shelves.data?.find((shelf) => shelf.id === from) : undefined;

  return (
    <AppShell title="New Shelf">
      <ShelfEditor
        shelf={shelfToClone ? { ...shelfToClone, id: '' } : emptyShelf}
        onBack={() => {
          router.push('/shelves');
        }}
      />
    </AppShell>
  );
}
