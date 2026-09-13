"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingPosterStrip } from "./LandingPosterStrip";
import styles from "./LandingPage.module.css";

type LandingHeroProps = {
  onJoin: () => void;
  onLogin: () => void;
};

export function LandingHero({ onJoin, onLogin }: LandingHeroProps) {
  return (
    <section className={styles.story} aria-labelledby="landing-title">
      <header className={styles.storyHeader}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="35mm home"
        >
          <span aria-hidden className={styles.brandLogo} />
        </Link>
        <nav className={styles.heroNav} aria-label="Primary navigation">
          <Link href="/discover" className={styles.navLink}>
            Discover
          </Link>
          <Link href="/films" className={styles.navLink}>
            Films
          </Link>
          <Link href="/lists" className={styles.navLink}>
            Lists
          </Link>
        </nav>
      </header>

      <div className={styles.heroContent}>
        <h1 id="landing-title" className={styles.headline}>
          A Social Network
          <br />
          for Cinema.
        </h1>
        <LandingPosterStrip />
        <p className={styles.lead}>
          <span>Keep track of films. Share your work.</span>{" "}
          <span>Find your people in cinema.</span>
        </p>
        <div className={styles.heroActions}>
          <button type="button" onClick={onJoin} className={styles.primaryAction}>
            Start on 35mm <ArrowRight size={17} aria-hidden />
          </button>
          <button type="button" onClick={onLogin} className={styles.loginCta}>
            Log in
          </button>
        </div>
      </div>
    </section>
  );
}
