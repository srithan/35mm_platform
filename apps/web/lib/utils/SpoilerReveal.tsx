"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";

type Particle = {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  phase: number;
  drift: number;
};

type FontMetrics = {
  ascent: number;
  descent: number;
};

type GrainLayout = {
  particles: Particle[];
  width: number;
  height: number;
};

const GRAIN_STEP_PX = 1.6;
const GRAIN_FILL_RATE = 0.78;
const TWINKLE_SPEED = 0.005;
const DRIFT_SPEED_X = 0.0035;
const DRIFT_SPEED_Y = 0.003;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function readFontMetrics(ctx: CanvasRenderingContext2D, font: string): FontMetrics {
  ctx.font = font;
  const sample = ctx.measureText("Mgyp");
  const fontSize = parseFloat(font) || 16;
  return {
    ascent: sample.actualBoundingBoxAscent || fontSize * 0.76,
    descent: sample.actualBoundingBoxDescent || fontSize * 0.22,
  };
}

function fontForTextNode(contentEl: HTMLElement, textNode: Text) {
  const parent = textNode.parentElement;
  if (parent && contentEl.contains(parent)) {
    return getComputedStyle(parent).font;
  }
  return getComputedStyle(contentEl).font;
}

function parseColor(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { r: 15, g: 15, b: 15, a: 1 };
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
}

function buildParticlesFromText(contentEl: HTMLElement, rootRect: DOMRect, dpr: number): Particle[] {
  const particles: Particle[] = [];
  const probe = document.createElement("canvas");
  const probeCtx = probe.getContext("2d");
  if (!probeCtx) return particles;

  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode() as Text | null;

  while (textNode) {
    const value = textNode.textContent || "";
    const font = fontForTextNode(contentEl, textNode);
    const metrics = readFontMetrics(probeCtx, font);

    for (let i = 0; i < value.length; i += 1) {
      const range = document.createRange();
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      const rects = range.getClientRects();

      for (let ri = 0; ri < rects.length; ri += 1) {
        const rect = rects[ri];
        if (rect.width < 0.5) continue;

        const baseline = rect.bottom - metrics.descent;
        const glyphTop = baseline - metrics.ascent;
        const glyphLeft = rect.left;
        const glyphWidth = rect.width;
        const glyphHeight = metrics.ascent + metrics.descent;
        const step = value.charAt(i) === " " ? GRAIN_STEP_PX * 1.5 : GRAIN_STEP_PX;

        for (let gy = 0; gy < glyphHeight; gy += step) {
          for (let gx = 0; gx < glyphWidth; gx += step) {
            if (Math.random() > GRAIN_FILL_RATE) continue;
            particles.push({
              x: (glyphLeft - rootRect.left + gx + Math.random() * step * 0.8) * dpr,
              y: (glyphTop - rootRect.top + gy + Math.random() * step * 0.8) * dpr,
              radius: (0.55 + Math.random() * 0.75) * dpr,
              baseOpacity: 0.42 + Math.random() * 0.48,
              phase: Math.random() * Math.PI * 2,
              drift: (0.22 + Math.random() * 0.55) * dpr,
            });
          }
        }
      }
    }

    textNode = walker.nextNode() as Text | null;
  }

  return particles;
}

function buildGrainLayout(contentEl: HTMLElement, rootRect: DOMRect, dpr: number): GrainLayout | null {
  if (rootRect.width < 1 || rootRect.height < 1) return null;

  const particles = buildParticlesFromText(contentEl, rootRect, dpr);
  if (particles.length === 0) return null;

  return {
    particles: particles,
    width: rootRect.width,
    height: rootRect.height,
  };
}

function drawSoftDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: { r: number; g: number; b: number },
  opacity: number
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + opacity + ")");
  gradient.addColorStop(0.5, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + opacity * 0.65 + ")");
  gradient.addColorStop(1, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  rgb: { r: number; g: number; b: number },
  time: number,
  animate: boolean
) {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    const twinkle = animate ? 0.62 + 0.38 * Math.sin(time * TWINKLE_SPEED + p.phase) : 0.9;
    const opacity = Math.min(1, p.baseOpacity * twinkle);
    if (opacity < 0.05) continue;

    let x = p.x;
    let y = p.y;
    if (animate) {
      x += Math.sin(time * DRIFT_SPEED_X + p.phase) * p.drift;
      y += Math.cos(time * DRIFT_SPEED_Y + p.phase * 1.2) * p.drift;
    }

    drawSoftDot(ctx, x, y, p.radius, rgb, opacity);
  }
}

export function SpoilerReveal(props: { children: ReactNode; className?: string }) {
  const revealedState = useState(false);
  const revealed = revealedState[0];
  const setRevealed = revealedState[1];

  const wrapRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const colorRef = useRef({ r: 15, g: 15, b: 15, a: 1 });

  const syncCanvas = useCallback(function syncCanvas() {
    const wrapEl = wrapRef.current;
    const contentEl = contentRef.current;
    const canvas = canvasRef.current;
    if (!wrapEl || !contentEl || !canvas) return;

    const rootRect = wrapEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const layout = buildGrainLayout(contentEl, rootRect, dpr);
    if (!layout) return;

    canvas.width = Math.max(1, Math.ceil(layout.width * dpr));
    canvas.height = Math.max(1, Math.ceil(layout.height * dpr));
    canvas.style.width = layout.width + "px";
    canvas.style.height = layout.height + "px";

    colorRef.current = parseColor(getComputedStyle(contentEl).color || "#0f0f0f");
    particlesRef.current = layout.particles;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawFrame(
      ctx,
      particlesRef.current,
      colorRef.current,
      performance.now(),
      !prefersReducedMotion()
    );
  }, []);

  useEffect(
    function () {
      if (revealed) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }

      const frame = requestAnimationFrame(function () {
        syncCanvas();
      });

      const wrapEl = wrapRef.current;
      if (!wrapEl) {
        return function () {
          cancelAnimationFrame(frame);
        };
      }

      const ro = new ResizeObserver(function () {
        syncCanvas();
      });
      ro.observe(wrapEl);

      const reduced = prefersReducedMotion();
      if (!reduced) {
        const tick = function (time: number) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          drawFrame(ctx, particlesRef.current, colorRef.current, time, true);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      return function () {
        cancelAnimationFrame(frame);
        ro.disconnect();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    },
    [revealed, syncCanvas, props.children]
  );

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (!revealed) setRevealed(true);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn("spoiler-ink", revealed && "spoiler-ink--revealed", props.className)}
      aria-label={revealed ? "Spoiler revealed" : "Reveal spoiler"}
      aria-pressed={revealed}
    >
      <span ref={wrapRef} className="spoiler-ink__text">
        <span ref={contentRef} className="spoiler-ink__content" aria-hidden={!revealed}>
          {props.children}
        </span>
        {!revealed ? <canvas ref={canvasRef} className="spoiler-ink__canvas" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}
