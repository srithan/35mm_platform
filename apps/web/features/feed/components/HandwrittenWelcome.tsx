"use client";

import { useRef } from "react";
import { Great_Vibes } from "next/font/google";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
});

interface HandwrittenWelcomeProps {
  className?: string;
  onComplete?: () => void;
}

export function HandwrittenWelcome({ className, onComplete }: HandwrittenWelcomeProps) {
  const hasCompletedRef = useRef(false);

  return (
    <div className={className}>
      <svg
        viewBox="0 0 760 160"
        role="img"
        aria-label="Welcome to 35mm"
        className="w-full max-w-[520px] h-auto"
      >
        <text
          x="50%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          className={`${greatVibes.className} welcome-text-base`}
        >
          Welcome to 35mm
        </text>

        <text
          x="50%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          className={`${greatVibes.className} welcome-text-draw`}
          onAnimationEnd={(event) => {
            if (event.animationName !== "welcome-fill") return;
            if (hasCompletedRef.current) return;
            hasCompletedRef.current = true;
            onComplete?.();
          }}
        >
          Welcome to 35mm
        </text>

        <text
          x="50%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          className={`${greatVibes.className} welcome-text-fill`}
        >
          Welcome to 35mm
        </text>
      </svg>

      <style jsx>{`
        .welcome-text-base,
        .welcome-text-draw {
          font-size: 84px;
          letter-spacing: 0.5px;
        }

        .welcome-text-base {
          fill: rgba(245, 240, 232, 0.07);
          opacity: 0;
          animation: welcome-base-fade 450ms ease forwards 220ms;
        }

        .welcome-text-draw {
          fill: transparent;
          stroke: rgba(245, 240, 232, 0.95);
          stroke-width: 2.1;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1540;
          stroke-dashoffset: 1540;
          filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
          animation:
            welcome-draw 1750ms cubic-bezier(0.2, 0.75, 0.25, 1) forwards,
            welcome-settle 650ms ease forwards 1400ms,
            welcome-fill 550ms ease forwards 1680ms;
        }

        .welcome-text-fill {
          fill: #f5f0e8;
          opacity: 0;
          filter: blur(3px);
          font-size: 84px;
          letter-spacing: 0.5px;
          animation: welcome-fill-layer 620ms ease forwards 1720ms;
        }

        @keyframes welcome-base-fade {
          to {
            opacity: 1;
          }
        }

        @keyframes welcome-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes welcome-settle {
          0% {
            stroke-width: 2.1;
          }
          100% {
            stroke-width: 1.2;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
          }
        }

        @keyframes welcome-fill {
          to {
            stroke: rgba(245, 240, 232, 0.35);
          }
        }

        @keyframes welcome-fill-layer {
          0% {
            opacity: 0;
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
}
