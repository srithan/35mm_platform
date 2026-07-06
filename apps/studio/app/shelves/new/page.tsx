import { Suspense } from 'react';
import NewShelfPageClient from '@/components/shelves/NewShelfPageClient';

export default function NewShelfPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading shelf editor…</div>}>
      <NewShelfPageClient />
    </Suspense>
  );
}
