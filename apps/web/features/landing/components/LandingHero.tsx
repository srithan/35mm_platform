"use client";

import { BrandLogo } from "@/components/Logo";

type LandingHeroProps = {
  onJoin: () => void;
  onLogin: () => void;
};

export function LandingHero({ onJoin, onLogin }: LandingHeroProps) {
  return (
    <section className="landing-hero" aria-label="Introduction">
      <div className="landing-hero__canvas">
        <div className="landing-hero__copy">
          <BrandLogo
            href="/"
            className="landing-hero__brand"
            markClassName="landing-hero__brand-mark"
            ariaLabel="35mm Home"
          />
          <p className="landing-hero__intro">Introducing 35mm. A social network for cinema.</p>
          <p className="landing-hero__lead">
            Follow your favorite filmmakers and friends to discover the films they are watching, rating,
            reviewing, and arguing about.
          </p>

          <div className="landing-hero__actions" aria-label="Account actions">
            <button type="button" onClick={onJoin} className="landing-hero__button landing-hero__button--primary">
              Join the cult
            </button>
            <button type="button" onClick={onLogin} className="landing-hero__button landing-hero__button--secondary">
              Login
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
