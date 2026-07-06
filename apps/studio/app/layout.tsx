import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { isStudioClerkEnabled } from '@/lib/auth/clerkConfig';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: '35mm Studio',
  description: 'Internal administration portal for 35mm film database operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const document = (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );

  if (!isStudioClerkEnabled) {
    return document;
  }

  return <ClerkProvider>{document}</ClerkProvider>;
}
