"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen antialiased flex flex-col items-center justify-center gap-4 px-6">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-neutral-600 text-center max-w-md">
          {error.message}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-fg text-bg rounded font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
