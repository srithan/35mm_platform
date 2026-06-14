"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

interface UseClampTextOptions {
  text: string;
  enabled: boolean;
  maxLines?: number;
  lineHeightFallback?: number;
}

export function useClampText({
  text,
  enabled,
  maxLines = 3,
  lineHeightFallback = 26.4,
}: UseClampTextOptions) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [truncatedText, setTruncatedText] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setIsOverflowing(false);
      setTruncatedText(null);
      return;
    }

    const bodyEl = bodyRef.current;
    const measureEl = measureRef.current;
    if (!bodyEl || !measureEl) return;

    const calculateTruncation = () => {
      const width = bodyEl.getBoundingClientRect().width;
      if (width <= 0) return;

      measureEl.style.width = `${width}px`;
      const lineHeight =
        parseFloat(window.getComputedStyle(bodyEl).lineHeight) || lineHeightFallback;
      const maxHeight = lineHeight * maxLines + 0.5;

      const fits = (value: string) => {
        measureEl.textContent = value;
        return measureEl.scrollHeight <= maxHeight;
      };

      if (fits(text)) {
        setIsOverflowing(false);
        setTruncatedText(null);
        return;
      }

      let low = 0;
      let high = text.length;
      let best = "";

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = text.slice(0, mid).trimEnd();

        if (fits(`${candidate} more`)) {
          best = candidate;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      const lastSpace = best.lastIndexOf(" ");
      const trimmedToWord =
        lastSpace > 24 && best.length - lastSpace < 18
          ? best.slice(0, lastSpace).trimEnd()
          : best;

      setIsOverflowing(true);
      setTruncatedText(trimmedToWord);
    };

    calculateTruncation();
    const observer = new ResizeObserver(calculateTruncation);
    observer.observe(bodyEl);

    return () => observer.disconnect();
  }, [text, enabled, maxLines, lineHeightFallback]);

  return {
    bodyRef: bodyRef as RefObject<HTMLParagraphElement>,
    measureRef: measureRef as RefObject<HTMLDivElement>,
    isOverflowing,
    truncatedText,
  };
}
