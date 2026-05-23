import Link from "next/link";
import { AUTH_LAYOUT_USE_LIGHT_THEME } from "@/lib/constants/authLayout";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authTheme = AUTH_LAYOUT_USE_LIGHT_THEME ? "light" : "dark";

  return (
    <div
      className="auth-shell min-h-screen flex flex-col relative overflow-hidden text-[var(--auth-fg)]"
      style={{ backgroundColor: "var(--auth-bg)" }}
      data-auth-theme={authTheme}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 38%, var(--auth-gradient-mid) 0%, transparent 58%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Link
          href="/"
          className="text-[1.75rem] tracking-wide no-underline transition-opacity hover:opacity-80 mb-10 text-[var(--auth-fg)]"
        >
          35<span className="text-[var(--auth-accent)]">mm</span>
        </Link>

        <div className="w-full max-w-[420px]">{children}</div>

        <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[var(--auth-fg)]/40 max-w-md text-center">
          <Link
            href="/about"
            className="no-underline hover:text-[var(--auth-fg)]/65 transition-colors"
          >
            About
          </Link>
          <span aria-hidden className="text-[var(--auth-fg)]/25">
            ·
          </span>
          <Link
            href="/privacy"
            className="no-underline hover:text-[var(--auth-fg)]/65 transition-colors"
          >
            Privacy
          </Link>
          <span aria-hidden className="text-[var(--auth-fg)]/25">
            ·
          </span>
          <Link
            href="/terms"
            className="no-underline hover:text-[var(--auth-fg)]/65 transition-colors"
          >
            Terms
          </Link>
          <span aria-hidden className="text-[var(--auth-fg)]/25">
            ·
          </span>
          <Link
            href="/help"
            className="no-underline hover:text-[var(--auth-fg)]/65 transition-colors"
          >
            Help
          </Link>
        </footer>
      </div>
    </div>
  );
}
