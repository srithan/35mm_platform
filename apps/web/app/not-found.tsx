import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold text-fg">404</h1>
      <p className="text-sm text-fg-muted text-center max-w-md">
        This page doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-block rounded-sm px-4 py-2 bg-fg text-bg hover:opacity-80 transition-opacity text-sm"
      >
        Go home
      </Link>
    </div>
  );
}
