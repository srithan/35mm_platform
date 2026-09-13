"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Icon } from "@/components/Icon/Icon";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

function ratingAtPointer(event: PointerEvent<HTMLInputElement>): number {
  const bounds = event.currentTarget.getBoundingClientRect();
  const position = (event.clientX - bounds.left) / bounds.width;
  return Math.max(0.5, Math.min(5, Math.ceil(position * 10) / 2));
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  const instructionsId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const displayedValue = preview ?? value;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    let nextValue: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        nextValue = Math.min(5, value + 0.5);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        nextValue = Math.max(0, value - 0.5);
        break;
      case "Home":
      case "Backspace":
      case "Delete":
        nextValue = 0;
        break;
      case "End":
        nextValue = 5;
        break;
      default:
        return;
    }
    event.preventDefault();
    setPreview(null);
    onChange(nextValue);
  }

  return (
    <div className="min-w-0 max-w-full">
      <div className="text-[11px] font-medium text-fg-muted">Rating <span className="font-normal">(optional)</span></div>
      <div className="flex flex-wrap items-center gap-x-2">
        <div className="relative flex h-8 w-[7.5rem] shrink-0 rounded focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg">
          {[1, 2, 3, 4, 5].map((star) => {
            const fillPercent = Math.max(0, Math.min(1, displayedValue - star + 1)) * 100;
            return (
              <span key={star} aria-hidden="true" className="pointer-events-none relative flex h-8 w-6 items-center justify-center">
                <span className="relative h-5 w-5">
                  <Icon
                    name="star"
                    className="h-5 w-5 text-[var(--color-rating-star-empty,var(--neutral-300))]"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                  {fillPercent > 0 && (
                    <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                      <Icon name="star" className="h-5 w-5 max-w-none text-[var(--color-rating-star,var(--color-accent))]" fill="currentColor" strokeWidth={0} />
                    </span>
                  )}
                </span>
              </span>
            );
          })}
          <input
            ref={inputRef}
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={value}
            aria-label="Rating (optional)"
            aria-valuetext={value === 0 ? "Unrated" : `${value} out of 5 stars`}
            aria-describedby={instructionsId}
            className="absolute inset-0 m-0 h-full w-full touch-none cursor-pointer opacity-0"
            onChange={(event) => {
              setPreview(null);
              onChange(Number(event.target.value));
            }}
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => {
              if (event.button !== 0 || activePointerRef.current !== null) return;
              event.preventDefault();
              event.currentTarget.focus();
              event.currentTarget.setPointerCapture(event.pointerId);
              activePointerRef.current = event.pointerId;
              setPreview(null);
              onChange(ratingAtPointer(event));
            }}
            onPointerMove={(event) => {
              const nextValue = ratingAtPointer(event);
              if (activePointerRef.current === event.pointerId) {
                onChange(nextValue);
              } else if (activePointerRef.current === null && event.pointerType === "mouse") {
                setPreview(nextValue);
              }
            }}
            onPointerUp={(event) => {
              if (activePointerRef.current !== event.pointerId) return;
              activePointerRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
              setPreview(null);
            }}
            onPointerCancel={(event) => {
              if (activePointerRef.current !== event.pointerId) return;
              activePointerRef.current = null;
              setPreview(null);
            }}
            onLostPointerCapture={(event) => {
              if (activePointerRef.current === event.pointerId) activePointerRef.current = null;
            }}
            onPointerLeave={() => setPreview(null)}
            onBlur={() => setPreview(null)}
          />
        </div>
        <span aria-hidden="true" className="min-w-[42px] text-[11px] tabular-nums text-fg-muted">
          {displayedValue === 0 ? "Unrated" : `${displayedValue} / 5`}
        </span>
        {value > 0 && (
          <button
            type="button"
            aria-label="Clear rating"
            className="min-h-8 rounded px-1 text-[11px] text-fg-muted underline underline-offset-2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            onClick={() => {
              onChange(0);
              setPreview(null);
              inputRef.current?.focus();
            }}
          >
            Clear
          </button>
        )}
      </div>
      <span id={instructionsId} className="sr-only">Use arrow keys to rate in half-star steps. Home clears the rating; End selects five stars.</span>
    </div>
  );
}
