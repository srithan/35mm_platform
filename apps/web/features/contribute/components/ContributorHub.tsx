import Link from "next/link";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { CONTRIBUTION_CONFIGS } from "../lib/contributionConfig";
import styles from "./Contribute.module.css";

export function ContributorHub() {
  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <div className={styles.topbar}>
          <span className={styles.crumb}>35mm Contributor Desk</span>
        </div>

        <section className={styles.hero} aria-labelledby="contribute-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Catalog stewardship</span>
            <h1 id="contribute-title" className={styles.title}>
              Contribute to the 35mm catalog.
            </h1>
            <p className={styles.lede}>
              Send missing films, metadata corrections, credits, images, trailers, and person-page
              fixes to moderators. Every submission needs sources. Approved changes update canonical
              35mm catalog records.
            </p>
            <div className={styles.heroActions}>
              <Link href={ROUTES.CONTRIBUTE_FORM("add-title")} className={styles.heroPrimaryAction}>
                <FilePlus2 size={18} strokeWidth={2} aria-hidden />
                Start contribution
              </Link>
              <Link href={ROUTES.CONTRIBUTE_SUBMISSIONS} className={styles.heroSecondaryAction}>
                <ClipboardList size={18} strokeWidth={2} aria-hidden />
                Track submissions
              </Link>
            </div>
          </div>

          <div className={styles.signal} aria-hidden>
            <div className={styles.signalFrame} />
            <div className={styles.signalMeta}>
              <strong>Review-first catalog edits</strong>
              <span>Queued submissions protect film identity, credits, media rights, and source quality.</span>
            </div>
          </div>
        </section>

        <div className={styles.sectionHeader}>
          <div>
            <h2>Choose contribution type</h2>
            <p>Pick the closest workflow. Each form validates required sources before review.</p>
          </div>
        </div>

        <div id="contribution-types" className={styles.cardGrid}>
          {CONTRIBUTION_CONFIGS.map(function (config) {
            return (
              <Link
                key={config.kind}
                href={ROUTES.CONTRIBUTE_FORM(config.slug)}
                className={styles.contributionCard}
              >
                <h3>{config.shortTitle}</h3>
                <p>{config.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
