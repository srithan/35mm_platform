"use client";

import { ArrowRight, Clapperboard, MessageCircle, Star, UsersRound } from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import styles from "./LandingPage.module.css";

type LandingHeroProps = {
  onJoin: () => void;
  onLogin: () => void;
};

export function LandingHero({ onJoin, onLogin }: LandingHeroProps) {
  return (
    <section className={styles.story} aria-labelledby="landing-title">
      <header className={styles.storyHeader}>
        <BrandLogo
          href="/"
          className={styles.brand}
          markClassName={styles.brandMark}
          ariaLabel="35mm home"
        />
        <button type="button" onClick={onLogin} className={styles.headerLogin}>
          Log in
        </button>
      </header>

      <div className={styles.storyCopy}>
        <p className={styles.eyebrow}>Social cinema, built around taste</p>
        <h1 id="landing-title" className={styles.headline}>
          Watch films.
          <br />
          {" "}
          Find <em>your people.</em>
        </h1>
        <p className={styles.lead}>
          Follow friends, critics, and filmmakers. See what they watch, recommend,
          review, and argue about in one living feed.
        </p>

        <div className={styles.mobileActions}>
          <button type="button" onClick={onJoin} className={styles.mobilePrimary}>
            Join 35mm <ArrowRight size={17} aria-hidden />
          </button>
          <button type="button" onClick={onLogin} className={styles.mobileSecondary}>
            Log in
          </button>
        </div>

        <ul className={styles.benefits} aria-label="What you can do on 35mm">
          <li>
            <UsersRound size={17} aria-hidden />
            <span>
              <strong>Your circle first.</strong> Build a feed from people whose taste you trust.
            </span>
          </li>
          <li>
            <MessageCircle size={17} aria-hidden />
            <span>
              <strong>Stay in the conversation.</strong> Reply to scenes, lists, reviews, and takes.
            </span>
          </li>
          <li>
            <Clapperboard size={17} aria-hidden />
            <span>
              <strong>Keep your film life together.</strong> Logs, ratings, reviews, and lists stay connected to people.
            </span>
          </li>
        </ul>
      </div>

      <div className={styles.productPreview} aria-label="Preview of social film conversations on 35mm">
        <div className={styles.previewHeader}>
          <span>Tonight in your circle</span>
          <span>Live feed</span>
        </div>

        <article className={styles.feedCard}>
          <div className={styles.feedCardMain}>
            <div className={styles.posterTile}>
              <span>Perfect Days</span>
              <small>Wenders</small>
            </div>
            <div>
              <div className={styles.feedUserRow}>
                <span className={styles.avatar}>M</span>
                <span>
                  <strong>Maya</strong>
                  <small>replayed the final shot</small>
                </span>
              </div>
              <p>
                Quiet ending. Big feeling. Anyone else read it as freedom, not loneliness?
              </p>
              <div className={styles.reactionRow} aria-hidden>
                <span><MessageCircle size={13} /> 18</span>
                <span><Star size={13} /> 4.5</span>
              </div>
            </div>
          </div>
        </article>

        <div className={styles.circleStack} aria-hidden>
          <span>AK</span>
          <span>LV</span>
          <span>JR</span>
          <span>ST</span>
          <strong>critics, friends, filmmakers</strong>
        </div>

        <div className={styles.threadCard} aria-hidden>
          <span className={styles.replyDot}>
            <MessageCircle size={13} />
          </span>
          <span>
            <strong>12 replies in your circle</strong>
            <small>Before it becomes a timeline argument</small>
          </span>
        </div>
      </div>
    </section>
  );
}
