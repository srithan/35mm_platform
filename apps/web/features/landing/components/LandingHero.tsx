"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import styles from "./LandingPage.module.css";

type LandingHeroProps = {
  onJoin: () => void;
  onLogin: () => void;
};

export function LandingHero({ onJoin, onLogin }: LandingHeroProps) {
  return (
    <section className={styles.story} aria-labelledby="landing-title">
      <Image
        src="/landing/cinema-after-screening.webp"
        alt="Film lovers talking outside a cinema after an evening screening"
        fill
        priority
        sizes="100vw"
        className={styles.heroImage}
      />
      <div className={styles.heroShade} aria-hidden />

      <header className={styles.storyHeader}>
        <BrandLogo
          href="/"
          className={styles.brand}
          markClassName={styles.brandMark}
          ariaLabel="35mm home"
        />
        <nav className={styles.heroNav} aria-label="Account access">
          <button type="button" onClick={onLogin} className={styles.loginButton}>
            Log in
          </button>
          <button type="button" onClick={onJoin} className={styles.headerJoinButton}>
            Join 35mm
          </button>
        </nav>
      </header>

      <div className={styles.heroContent}>
        <h1 id="landing-title" className={styles.headline}>
          The film ends.
          <br />
          Your circle keeps talking.
        </h1>
        <p className={styles.lead}>
          Follow friends, critics, and filmmakers. Share what moved you and find your next watch.
        </p>
        <button type="button" onClick={onJoin} className={styles.primaryAction}>
          Join 35mm — it’s free <ArrowRight size={17} aria-hidden />
        </button>
        <p className={styles.socialNote}>A social network for film lovers.</p>
      </div>
    </section>
  );
}
