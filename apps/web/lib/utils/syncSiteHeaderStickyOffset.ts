/**
 * Sets --site-header-sticky-offset from #site-nav height so sticky subheaders sit flush under SiteHeader.
 */
export function syncSiteHeaderStickyOffset() {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(min-width: 768px)").matches) {
    document.documentElement.style.removeProperty("--site-header-sticky-offset");
    return;
  }
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  const h = nav.getBoundingClientRect().height;
  if (h < 1) return;
  document.documentElement.style.setProperty("--site-header-sticky-offset", `${h}px`);
}
