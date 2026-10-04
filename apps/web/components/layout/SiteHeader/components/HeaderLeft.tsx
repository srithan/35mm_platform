import { ROUTES } from "@/lib/constants/routes";
import { BrandLogo } from "@/components/Logo";
import { GlobalSearchBar } from "@/components/SearchBar";
import styles from "../SiteHeader.module.css";

export function HeaderLeft() {
  return (
    <div className={styles.navLeft}>
      <BrandLogo
        href={ROUTES.HOME}
        className={styles.navLogo}
        style={{ fontSize: "1.75rem" }}
      />
      <div className={styles.headerSearchWrap}>
        <GlobalSearchBar className={styles.headerSearch} />
      </div>
    </div>
  );
}
