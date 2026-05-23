import { useEffect, useState, RefObject } from "react";

export function useCarouselScroll(trackRef: RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const updateArrows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // allow a small margin (8px)
      setCanScrollLeft(scrollLeft >= 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    };

    // Attach scroll event listener
    el.addEventListener("scroll", updateArrows);
    // Initial check
    updateArrows();

    // Check on window resize
    window.addEventListener("resize", updateArrows);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [trackRef]);

  // Handle Drag to Scroll for Desktop
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.style.cursor = "grabbing";
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      el.style.cursor = "grab";
    };

    const handleMouseUp = () => {
      isDown = false;
      el.style.cursor = "grab";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      // scroll inverted for drag feeling, and a 1.2x multiplier for speed jump
      const walk = (x - startX) * 1.2;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("mouseup", handleMouseUp);
    el.addEventListener("mousemove", handleMouseMove);

    // Initial cursor
    el.style.cursor = "grab";

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("mousemove", handleMouseMove);
    };
  }, [trackRef]);

  return {
    canScrollLeft,
    canScrollRight,
    scrollTrack: (dir: 1 | -1) => {
      if (trackRef.current) {
        // scroll by ~one card width
        trackRef.current.scrollBy({ left: dir * 168, behavior: "smooth" });
      }
    },
  };
}
