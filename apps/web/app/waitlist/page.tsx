import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import { ProjectionDeskScene } from "@/components/ProjectionDeskScene";
import styles from "./waitlist.module.css";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "35mm is the social network for film. Join the launch waitlist.",
  openGraph: {
    title: "The social network for film — 35mm",
    description:
      "Follow film lovers, critics, and filmmakers. Join the 35mm launch waitlist.",
  },
  twitter: {
    title: "The social network for film — 35mm",
    description:
      "Follow film lovers, critics, and filmmakers. Join the 35mm launch waitlist.",
  },
};

export default function WaitlistPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <BrandLogo
          href="/"
          className={styles.logo}
          markClassName={styles.logoMark}
          ariaLabel="35mm home"
        />
        <p className={styles.previewLabel}>
          <span className={styles.statusDot} aria-hidden="true" />
          Private preview
        </p>
      </header>

      <section className={styles.copyPanel} aria-labelledby="waitlist-title">
        <div className={styles.copyInner}>
          <p className={styles.eyebrow}>Coming soon</p>
          <h1 id="waitlist-title" className={styles.title}>
            The social network
            <br />
            <em>for film.</em>
          </h1>
          <p className={styles.intro}>
            Follow film lovers, critics, and filmmakers. Share what
            you&apos;re watching or making, join the conversation, and
            discover cinema through people you trust. Join the waitlist
            to reserve your username.
          </p>

          <form className={styles.form} aria-label="Join the 35mm waitlist">
            <div className={styles.field}>
              <label className={styles.label} htmlFor="waitlist-username">
                Reserve your username
              </label>
              <div className={styles.usernameControl}>
                <span className={styles.usernamePrefix} aria-hidden="true">
                  35mm.in/
                </span>
                <input
                  id="waitlist-username"
                  className={styles.input}
                  name="username"
                  type="text"
                  placeholder="yourname"
                  autoComplete="username"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="waitlist-email">
                Email address
              </label>
              <input
                id="waitlist-email"
                className={styles.input}
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button className={styles.submitButton} type="button">
              <span>Reserve my username</span>
              <ArrowUpRight aria-hidden="true" strokeWidth={1.7} />
            </button>
          </form>

          <p className={styles.formNote}>
            One email when doors open. Nothing else.
          </p>
        </div>
      </section>

      <section className={styles.scenePanel} aria-label="35mm preview">
        <ProjectionDeskScene
          className={styles.projection}
          fallback={
            <span>
              35mm is almost ready.
              <br />
              Your browser cannot show this preview.
            </span>
          }
        />
        <div className={styles.sceneWash} aria-hidden="true" />
        <div className={styles.sceneCaption}>
          <span>Now projecting</span>
          <span>35mm / Preview</span>
        </div>
      </section>
    </main>
  );
}
