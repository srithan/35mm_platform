import { useRef } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import styles from "../SiteHeader.module.css";

export function HeaderLeft() {
  const standaloneSearchRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.navLeft}>
      <Link href={ROUTES.HOME} className={styles.navLogo}>
        35mm<span className={styles.dot}>.</span>
      </Link>
      <div className={styles.standaloneSearch}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={standaloneSearchRef}
          id="header-standalone-search"
          className={styles.standaloneSearchInput}
          type="search"
          name="header-standalone-search"
          placeholder="Search films, people, reviews…"
          aria-label="Search films, people, and reviews"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
    </div>
  );
}
