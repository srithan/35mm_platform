/**
 * Vanilla JS utility to spawn heart-like particles when liking a post.
 * Uses DOM directly — call from React with the button element ref.
 */
export function spawnParticles(btn: HTMLElement): void {
  const colors = [
    "var(--color-like)",
    "var(--color-accent)",
    "var(--color-warning)",
    "var(--color-text-secondary)",
    "var(--color-like)"
  ];
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 10; i++) {
    const p = document.createElement("div");
    p.className = "heart-particle";
    const angle = (i / 10) * Math.PI * 2;
    const dist = 20 + Math.random() * 16;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const size = 3 + Math.random() * 4;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      background:${colors[i % colors.length]};
      left:${cx + window.scrollX}px;
      top:${cy + window.scrollY}px;
      --tx:${tx}px; --ty:${ty}px;
      position:fixed;
      animation-duration:${0.6 + Math.random() * 0.2}s;
      animation-delay:${Math.random() * 0.04}s;
    `;
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}
