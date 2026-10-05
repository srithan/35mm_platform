import Link from "next/link";
import { Search } from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import { LegalFooterMark } from "@/components/legal/LegalFooterMark";
import styles from "@/components/legal/LegalPage.module.css";

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
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <details className={styles.menu}>
            <summary className={styles.menuSummary}>
              <span className={styles.menuMark} aria-hidden="true" />
              Menu
            </summary>
            <nav aria-label="Company and legal navigation" className={styles.menuPanel}>
              {FOOTER_LINKS.map(function (item) {
                return <Link key={item.href} href={item.href}>{item.label}</Link>;
              })}
            </nav>
          </details>
          <BrandLogo href="/" className={styles.logo} />
          <Link href="/discover" aria-label="Search 35mm" className={styles.searchLink}>
            <Search aria-hidden="true" size={23} strokeWidth={1.25} />
          </Link>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMeta}>
            <p className={styles.copyright}>&copy; 2026 35mm / all rights reserved</p>
            <nav aria-label="Legal and company links" className={styles.footerNav}>
              {FOOTER_LINKS.map(function (item) {
                return <Link key={item.href} href={item.href}>{item.label}</Link>;
              })}
            </nav>
          </div>
          <LegalFooterMark />
        </div>
      </footer>
    </div>
  );
}
