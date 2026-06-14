import { create } from "zustand";

type MobileBottomChromeState = {
  navVisible: boolean;
  setNavVisible: (visible: boolean) => void;
};

export const useMobileBottomChromeStore = create<MobileBottomChromeState>(function (set) {
  return {
    navVisible: true,
    setNavVisible: function (navVisible) {
      set({ navVisible: navVisible });
    },
  };
});

const SCROLL_DELTA = 8;
const TOP_LOCK = 12;

export function bindMobileBottomChromeScroll() {
  if (typeof window === "undefined") {
    return function () {};
  }

  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;
    const setNavVisible = useMobileBottomChromeStore.getState().setNavVisible;

    if (y <= TOP_LOCK) {
      setNavVisible(true);
    } else if (delta > SCROLL_DELTA) {
      setNavVisible(false);
    } else if (delta < -SCROLL_DELTA) {
      setNavVisible(true);
    }

    lastY = y;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  return function () {
    window.removeEventListener("scroll", onScroll);
  };
}
