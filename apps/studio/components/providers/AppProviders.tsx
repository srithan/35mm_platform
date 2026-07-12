'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StudioThemeProvider } from '@/components/providers/ThemeProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <StudioThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" offset="76px" />
          </TooltipProvider>
        </StudioThemeProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
