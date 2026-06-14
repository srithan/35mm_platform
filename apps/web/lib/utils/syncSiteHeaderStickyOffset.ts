/**
 * Sets sticky header offsets from measured nav heights so subheaders sit flush underneath.
 */
export function syncSiteHeaderStickyOffset() {
  if (typeof window === "undefined") return;

  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  const mobileNav = document.getElementById("mobile-site-nav");

  if (mobileNav && !isDesktop) {
    const mobileHeight = mobileNav.getBoundingClientRect().height;
    if (mobileHeight >= 1) {
      document.documentElement.style.setProperty(
        "--mobile-header-sticky-offset",
        `${mobileHeight}px`
      );
    }
  }

  if (!isDesktop) {
    return;
  }

  const nav = document.getElementById("site-nav");
  if (!nav) return;
  const h = nav.getBoundingClientRect().height;
  if (h < 1) return;
  document.documentElement.style.setProperty("--site-header-sticky-offset", `${h}px`);
}
