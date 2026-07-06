'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { ClerkSetupNotice } from '@/components/auth/ClerkSetupNotice';
import { CustomAuthForm, CustomSignedInPanel } from '@/components/auth/CustomAuthForm';

const accessRows = [
  'Curator and admin workspaces',
  'Catalog queues and import tooling',
  'Moderation and infrastructure views',
];

export function LandingAuthPanel({ clerkEnabled }: { clerkEnabled: boolean }) {
  if (!clerkEnabled) {
    return <LandingAuthUnavailable />;
  }

  return <LandingAuthReady />;
}

function LandingAuthReady() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="size-4 text-amber-500" />
          Secure access
        </div>
        <h2 className="text-3xl font-semibold leading-tight">Sign in to 35mm Studio</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Create your first operator account or continue with an existing session.
        </p>
      </div>

      {!isLoaded ? (
        <div className="space-y-3 rounded-[8px] border bg-card p-4 shadow-sm">
          <div className="h-10 animate-pulse rounded-[8px] bg-muted" />
          <div className="h-10 animate-pulse rounded-[8px] bg-muted" />
        </div>
      ) : null}

      {isLoaded && !isSignedIn ? (
        <>
          <CustomAuthForm mode="sign-up" compact />

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/sign-up" className="rounded-[8px] border px-3 py-2 text-center hover:bg-muted">
              Sign-up page
            </Link>
            <Link href="/sign-in" className="rounded-[8px] border px-3 py-2 text-center hover:bg-muted">
              Login page
            </Link>
          </div>

          <div className="rounded-[8px] border bg-secondary/45 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Custom auth UI</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Forms are local components. Clerk handles credentials and sessions only.
              </p>
            </div>
          </div>
        </>
      ) : null}

      {isLoaded && isSignedIn ? (
        <CustomSignedInPanel />
      ) : null}

      <div className="space-y-2">
        {accessRows.map((row) => (
          <div key={row} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" />
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingAuthUnavailable() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="size-4 text-amber-500" />
          Secure access
        </div>
        <h2 className="text-3xl font-semibold leading-tight">Connect Clerk to continue</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          The landing page is ready. Signup and login controls will mount after the Clerk keys are set.
        </p>
      </div>

      <ClerkSetupNotice />

      <div className="space-y-2">
        {accessRows.map((row) => (
          <div key={row} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" />
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}
