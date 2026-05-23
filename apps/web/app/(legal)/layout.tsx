import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-[20px] leading-none font-semibold tracking-tight text-fg no-underline">
            35<span className="text-accent">mm</span>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-fg-muted no-underline hover:text-fg transition-colors"
          >
            &larr; Back to feed
          </Link>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto">
        {children}
      </main>

      <footer className="max-w-[600px] mx-auto px-6 py-8 text-[11px] text-fg-muted border-t border-border mt-12 flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/about" className="text-inherit no-underline hover:text-fg-light transition-colors">About</Link>
        <Link href="/careers" className="text-inherit no-underline hover:text-fg-light transition-colors">Careers</Link>
        <Link href="/privacy" className="text-inherit no-underline hover:text-fg-light transition-colors">Privacy</Link>
        <Link href="/terms" className="text-inherit no-underline hover:text-fg-light transition-colors">Terms</Link>
        <Link href="/help" className="text-inherit no-underline hover:text-fg-light transition-colors">Help</Link>
        <span className="basis-full mt-2 text-fg-muted/60">&copy; 2026 35mm</span>
      </footer>
    </div>
  );
}
