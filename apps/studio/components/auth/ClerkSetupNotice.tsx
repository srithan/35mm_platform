import { KeyRound, ShieldAlert } from 'lucide-react';

export function ClerkSetupNotice() {
  return (
    <div className="space-y-4 rounded-[8px] border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-amber-500/12 text-amber-600">
          <ShieldAlert className="size-4" />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Clerk keys required</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Add the Clerk environment keys to enable signup, login, sessions, and protected routes.
          </p>
        </div>
      </div>

      <div className="rounded-[8px] border bg-secondary/55 p-3 font-mono text-xs leading-6 text-muted-foreground">
        <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...</div>
        <div>CLERK_SECRET_KEY=...</div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <KeyRound className="size-4 text-emerald-600" />
        Clerk UI activates automatically once those values are present.
      </div>
    </div>
  );
}
