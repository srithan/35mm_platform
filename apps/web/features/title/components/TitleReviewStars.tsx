"use client";

import { useId } from "react";

/** Lucide “star” path, 24×24. */
const STAR_D =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

const starClass = "h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5";

type TitleReviewStarsProps = { rating: number };

function safeSvgId(hookId: string): string {
  return "trs" + hookId.split(":").join("");
}

export function TitleReviewStars(props: TitleReviewStarsProps) {
  const r = props.rating;
  const full = Math.floor(r);
  const half = r % 1 >= 0.5 && r % 1 < 1;
  const display = r % 1 === 0 ? String(r) : r.toFixed(1);
  const baseId = safeSvgId(useId());
  const gradId = "g" + baseId;

  return (
    <div
      className="inline-flex max-w-full items-center gap-2.5 rounded-[10px] border border-border bg-elevated/50 px-2.5 py-1.5 shadow-sm dark:bg-sunken/40"
      role="img"
      aria-label={r + " out of 5 stars"}
    >
      <div className="flex items-center gap-0.5 sm:gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map(function (i) {
          const isFull = i <= full;
          const isHalf = i === full + 1 && half;
          if (isFull) {
            return (
              <svg
                key={i}
                className={starClass}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d={STAR_D}
                  fill="var(--color-accent)"
                  className="drop-shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]"
                />
              </svg>
            );
          }
          if (isHalf) {
            return (
              <svg
                key={i}
                className={starClass}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id={gradId}
                    x1="0"
                    y1="0"
                    x2="24"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="50%" stopColor="var(--color-accent)" />
                    <stop offset="50%" stopColor="var(--neutral-300)" />
                  </linearGradient>
                </defs>
                <path d={STAR_D} fill={"url(#" + gradId + ")"} />
              </svg>
            );
          }
          return (
            <svg
              key={i}
              className={starClass + " text-fg/25 dark:text-fg/30"}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={STAR_D}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinejoin="round"
              />
            </svg>
          );
        })}
      </div>

      <div className="h-4 w-px shrink-0 bg-fg/12 dark:bg-fg/15" aria-hidden />

      <div className="flex min-w-0 items-baseline gap-1 tabular-nums">
        <span className="text-[0.9375rem] font-semibold leading-none tracking-[-0.02em] text-fg sm:text-base">
          {display}
        </span>
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.06em] text-fg/45 sm:text-[11px]">
          / 5
        </span>
      </div>
    </div>
  );
}
