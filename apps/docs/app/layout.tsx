import "./globals.css";
import "@scalar/api-reference-react/style.css";
import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "35mm API & Data Model", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><header className="site-header"><Link href="/"><strong>35mm Developer Docs</strong></Link><nav><Link href="/guides/getting-started">Guides</Link><Link href="/api-reference">API Reference</Link><Link href="/data-model">Data Model</Link><Link href="/guides/realtime">Realtime</Link><Link href="/guides/changelog">Changelog</Link></nav></header>{children}</body></html>;
}
