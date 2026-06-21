import Link from "next/link";
import { BrandLogo } from "@/components/Logo";

const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Help", href: "/help" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg font-sans text-fg antialiased">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-[52px] max-w-[680px] items-center justify-between px-6 sm:px-8">
          <BrandLogo
            href="/"
            className="text-[17px] font-semibold tracking-[-0.02em] text-fg"
          >
            35mm
          </BrandLogo>
          <Link
            href="/"
            className="text-[13px] font-medium text-fg-muted no-underline transition-colors hover:text-fg"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[680px]">{children}</main>

      <footer className="mx-auto mt-16 max-w-[680px] border-t border-border px-6 py-10 sm:px-8">
        <nav
          aria-label="Legal and company links"
          className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-fg-muted"
        >
          {FOOTER_LINKS.map(function (item) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="text-inherit no-underline transition-colors hover:text-fg"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-6 text-[12px] text-fg-faint">&copy; 2026 35mm</p>
      </footer>
    </div>
  );
}
