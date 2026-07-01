"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { BrandLogo } from "@/components/Logo";
import { SearchBar } from "@/components/SearchBar";
import styles from "../SiteHeader.module.css";

export function HeaderLeft() {
  const router = useRouter();

  return (
    <div className={styles.navLeft}>
      <BrandLogo href={ROUTES.HOME} className={styles.navLogo}>
        35mm<span className={styles.dot}>.</span>
      </BrandLogo>
      <div className={styles.headerSearchWrap}>
        <SearchBar
          placeholder="Search 35mm"
          category="all"
          variant="inline"
          size="compact"
          showEmptySuggestions
          className={styles.headerSearch}
          onNavigate={(href) => router.push(href)}
        />
      </div>
    </div>
  );
}
