"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

type ShaderInstance = {
  destroy?: () => void;
  dispose?: () => void;
};

interface LiquidMetalButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export function LiquidMetalButton({
  onClick,
  className,
  label = "Let's go",
}: LiquidMetalButtonProps) {
  const shaderRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let shaderInstance: ShaderInstance | undefined;
    let cancelled = false;

    const mountShader = async () => {
      const target = shaderRef.current;
      if (!target) return;

      const shaderModule = await import("@paper-design/shaders");
      if (cancelled || !shaderRef.current) return;

      shaderInstance = new shaderModule.ShaderMount(
        shaderRef.current,
        shaderModule.liquidMetalFragmentShader,
        {
          u_repetition: 1.5,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 100,
          u_scale: 1.5,
          u_shape: 1,
          u_offsetX: 0.1,
          u_offsetY: -0.1,
        },
        undefined,
        0.6
      ) as ShaderInstance;
    };

    void mountShader();

    return () => {
      cancelled = true;
      shaderInstance?.destroy?.();
      shaderInstance?.dispose?.();
      if (shaderRef.current) {
        shaderRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        buttonRef.current?.classList.remove("cta-pop");
        // Force reflow so repeated clicks retrigger animation cleanly.
        void buttonRef.current?.offsetWidth;
        buttonRef.current?.classList.add("cta-pop");
        onClick();
      }}
      aria-label={label}
      className={cn(
        "group relative w-[112px] h-[112px] rounded-full overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.06] hover:-translate-y-0.5 active:scale-[0.95] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/20",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:shadow-[0_0_0_6px_rgba(255,255,255,0.12),0_0_32px_rgba(230,230,230,0.22),0_26px_38px_rgba(0,0,0,0.36)]" />
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 liquid-ring-spin" />
      {/* Animated shader sits on the full circle; center cap masks it so only ring stays visible */}
      <span
        ref={shaderRef}
        className="absolute inset-0 rounded-full overflow-hidden"
      />
      <span className="pointer-events-none absolute -inset-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 liquid-sheen" />
      <span className="absolute inset-[8px] rounded-full bg-gradient-to-b from-[#4d4d4d] to-[#090909] shadow-[inset_0_1px_3px_rgba(255,255,255,0.35),0_10px_24px_rgba(0,0,0,0.35)]" />
      <span className="absolute inset-[8px] rounded-full border border-white/10" />

      <span className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="w-8 h-8 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:scale-110 group-active:translate-x-0 group-active:scale-100"
          fill="currentColor"
        >
          <path d="M14.72 5.22a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06L19.44 12l-4.72-5.22a.75.75 0 0 1 0-1.06Z" />
          <path d="M3 12a.75.75 0 0 1 .75-.75h17.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Z" />
        </svg>
      </span>

      <style jsx>{`
        :global(.cta-pop) {
          animation: cta-pop 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .liquid-ring-spin {
          background: conic-gradient(
            from 180deg,
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.45),
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.45),
            rgba(255, 255, 255, 0.06)
          );
          mask: radial-gradient(circle, transparent 57%, black 59%);
          -webkit-mask: radial-gradient(circle, transparent 57%, black 59%);
          animation: ring-spin 2.4s linear infinite paused;
        }

        .group:hover .liquid-ring-spin {
          animation-play-state: running;
        }

        .liquid-sheen {
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 22%,
            rgba(255, 255, 255, 0.28) 48%,
            rgba(255, 255, 255, 0) 74%
          );
          transform: translateX(-130%) rotate(8deg);
          transition: transform 760ms cubic-bezier(0.2, 1, 0.3, 1), opacity 360ms ease;
        }

        .group:hover .liquid-sheen {
          transform: translateX(120%) rotate(8deg);
        }

        @keyframes cta-pop {
          0% {
            transform: scale(1);
          }
          35% {
            transform: scale(0.93);
          }
          70% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes ring-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}
