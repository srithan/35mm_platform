"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { landingPosters } from "../lib/landingPosters";
import styles from "./LandingPage.module.css";

export function LandingPosterStrip() {
  const railRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let isIntersecting = false;
    const updateVisibility = () => {
      setIsVisible(isIntersecting && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      updateVisibility();
    });

    observer.observe(rail);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Native lazy loading can wait until transformed images cross the clipping edge.
    // Load one rail-width ahead so the continuous track does not reveal empty frames.
    const imageObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLImageElement).loading = "eager";
        imageObserver.unobserve(entry.target);
      }
    }, { root: rail, rootMargin: "0px 100%" });

    const observeUpcomingImages = () => {
      imageObserver.disconnect();
      if (reducedMotion.matches) return;
      rail.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => {
        imageObserver.observe(image);
      });
    };
    observeUpcomingImages();
    reducedMotion.addEventListener("change", observeUpcomingImages);
    return () => {
      imageObserver.disconnect();
      reducedMotion.removeEventListener("change", observeUpcomingImages);
    };
  }, []);

  return (
    <div className={styles.posterStrip}>
      <div
        ref={railRef}
        className={styles.posterRail}
        role="group"
        aria-label="Films from around the world"
        data-paused={isPaused || !isVisible}
      >
        <div
          className={styles.posterTrack}
          style={{ "--poster-duration": `${landingPosters.length * 2}s` } as CSSProperties}
        >
          {[false, true].map((isDuplicate) => (
            <div
              key={String(isDuplicate)}
              className={styles.posterSequence}
              aria-hidden={isDuplicate || undefined}
            >
              {landingPosters.map((poster, index) => (
                <figure key={poster.src} className={styles.posterFrame}>
                  <Image
                    src={poster.src}
                    alt={isDuplicate ? "" : `${poster.title} film poster`}
                    fill
                    priority={!isDuplicate && index < 6}
                    sizes="(max-width: 828px) 116px, (max-width: 1200px) 14vw, 168px"
                    className={styles.posterImage}
                  />
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={styles.posterMotionToggle}
        onClick={() => setIsPaused((paused) => !paused)}
        aria-label={isPaused ? "Play film animation" : "Pause film animation"}
      >
        {isPaused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
      </button>
    </div>
  );
}
