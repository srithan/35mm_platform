"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";

interface LikeButtonProps {
  liked: boolean;
  likeCount: number;
  hideCount?: boolean;
  onToggle: () => void;
  className?: string;
}

export function LikeButton({
  liked,
  likeCount,
  hideCount = false,
  onToggle,
  className,
}: LikeButtonProps) {
  const armClipId = useId();
  const animatingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [visualLiked, setVisualLiked] = useState(liked);
  const [burst, setBurst] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!animatingRef.current) {
      setVisualLiked(liked);
    }
  }, [liked]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const handleClick = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const willLike = !liked;
    onToggle();

    if (willLike) {
      setBurst(true);
      setAnimating(true);

      schedule(() => {
        setAnimating(false);
        setVisualLiked(true);
        setSettling(true);

        schedule(() => {
          setSettling(false);
          setSettled(true);

          schedule(() => {
            setSettled(false);
            setBurst(false);
            animatingRef.current = false;
          }, 200);
        }, 150);
      }, 580);
    } else {
      setVisualLiked(false);
      setBurst(true);

      schedule(() => {
        setBurst(false);
        animatingRef.current = false;
      }, 450);
    }
  }, [liked, onToggle, schedule]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn("action-btn like-action", className, visualLiked && "liked")}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this post" : "Like this post"}
    >
      <span
        className={cn(
          "like-btn",
          visualLiked && "liked",
          burst && "burst",
          animating && "animating",
          settling && "settling",
          settled && "settled",
        )}
      >
        <span className="like-ripple" aria-hidden="true" />
        <span className="like-particles" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="like-particle" />
          ))}
        </span>
        <span className="like-icon-layer" aria-hidden="true">
          <svg
            className="like-heart-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="like-heart-path"
              d="M20.84 4.61C19.68 3.45 18.11 2.8 16.47 2.8C14.83 2.8 13.26 3.45 12.1 4.61L12 4.71L11.9 4.61C10.74 3.45 9.17 2.8 7.53 2.8C5.89 2.8 4.32 3.45 3.16 4.61C0.75 7.02 0.75 10.93 3.16 13.34L4.22 14.4L12 22.18L19.78 14.4L20.84 13.34C23.25 10.93 23.25 7.02 20.84 4.61Z"
            />
          </svg>
          <svg
            className="like-clap-icon"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="10" width="22" height="15" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="0.8" />
            <rect x="3" y="13" width="22" height="2.5" fill="var(--color-like)" opacity="0.9" />
            <rect x="3" y="17.5" width="22" height="2" fill="var(--color-like)" opacity="0.5" />
            <rect x="3" y="8" width="22" height="3.5" rx="1.5" fill="#222" stroke="#444" strokeWidth="0.8" />
            <g className="like-clap-arm">
              <rect x="3" y="4.5" width="22" height="4" rx="1.5" fill="#1a1a1a" stroke="#444" strokeWidth="0.8" />
              <defs>
                <clipPath id={armClipId}>
                  <rect x="3" y="4.5" width="22" height="4" rx="1.5" />
                </clipPath>
              </defs>
              <g clipPath={`url(#${armClipId})`}>
                <line x1="7" y1="4" x2="5" y2="9" stroke="var(--color-like)" strokeWidth="2.5" />
                <line x1="12" y1="4" x2="10" y2="9" stroke="var(--color-like)" strokeWidth="2.5" />
                <line x1="17" y1="4" x2="15" y2="9" stroke="var(--color-like)" strokeWidth="2.5" />
                <line x1="22" y1="4" x2="20" y2="9" stroke="var(--color-like)" strokeWidth="2.5" />
              </g>
            </g>
          </svg>
        </span>
      </span>
      {!hideCount && (
        <span className="action-count">{formatCount(likeCount)}</span>
      )}
    </button>
  );
}
