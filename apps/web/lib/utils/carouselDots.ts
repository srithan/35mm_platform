export function carouselDotSize(index: number, activeIndex: number, count: number) {
  const distance = Math.abs(index - activeIndex);
  if (distance === 0) return 8;
  if (count <= 5) return 7;

  if (activeIndex <= 1 && index > activeIndex) {
    if (distance <= 2) return 7;
    if (distance === 3) return 6;
    if (distance === 4) return 5;
    return 4;
  }

  if (activeIndex >= count - 2 && index < activeIndex) {
    if (distance <= 2) return 7;
    if (distance === 3) return 6;
    if (distance === 4) return 5;
    return 4;
  }

  if (distance <= 2) return 7;
  if (distance === 3) return 4;
  return 3;
}

export function carouselDotStyle(size: number) {
  return {
    height: size,
    width: size,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.18)",
  };
}

/** Theme-aware nav pill for in-feed / in-app carousels */
export const carouselNavButtonClass =
  "flex items-center justify-center rounded-full border border-border bg-elevated/95 text-fg shadow-sm transition-colors hover:bg-hover hover:border-border-strong";

/** Nav pill for carousels on dark photo/video backgrounds */
export const carouselNavButtonOnDarkClass =
  "flex items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/60 hover:border-white/35";
