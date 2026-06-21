"use client";

import type { ReactNode } from "react";

type LandingHeroProps = {
  authPanel: ReactNode;
  authRef: React.RefObject<HTMLDivElement>;
};

export function LandingHero({ authPanel, authRef }: LandingHeroProps) {
  return (
    <section className="landing-hero" aria-label="Introduction">
      <div className="landing-hero__canvas">
        <div className="landing-hero__copy">
          <h1 className="landing-hero__title">The social network for film.</h1>
          <p className="landing-hero__lead">
            35mm is where directors, critics, programmers, and obsessive viewers log what they watch, rate
            films, and talk about cinema with people they follow.
          </p>
          <p className="landing-hero__detail">
            Post a review with the film attached. Follow a DP whose work you steal from. Build a profile from
            your diary and favourites. Your feed is assembled from those relationships — not an algorithm
            guessing what you want to see.
          </p>
        </div>

        <aside className="landing-hero__auth landing-hero__auth--desktop">{authPanel}</aside>

        <div ref={authRef} className="landing-hero__auth landing-hero__auth--mobile">
          {authPanel}
        </div>
      </div>
    </section>
  );
}
