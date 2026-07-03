"use client";

import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ForwardedRef,
  type MutableRefObject,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./CreepyButton.module.css";

type EyeOffset = {
  x: number;
  y: number;
};

type PupilStyle = CSSProperties & {
  "--creepy-button-pupil-x": string;
  "--creepy-button-pupil-y": string;
};

export type CreepyButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function assignForwardedRef<T>(ref: ForwardedRef<T>, node: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(node);
    return;
  }

  (ref as MutableRefObject<T | null>).current = node;
}

export const CreepyButton = forwardRef<HTMLButtonElement, CreepyButtonProps>(
  function CreepyButton({ children, className, disabled, onPointerLeave, onPointerMove, type, ...props }, ref) {
    const eyesRef = useRef<HTMLSpanElement>(null);
    const [eyeOffset, setEyeOffset] = useState<EyeOffset>({ x: 0, y: 0 });

    const setButtonRef = useCallback(
      function setButtonNode(node: HTMLButtonElement | null) {
        assignForwardedRef(ref, node);
      },
      [ref]
    );

    const resetEyes = useCallback(
      function resetEyeOffset(event: PointerEvent<HTMLButtonElement>) {
        setEyeOffset({ x: 0, y: 0 });
        onPointerLeave?.(event);
      },
      [onPointerLeave]
    );

    const updateEyes = useCallback(
      function updateEyeOffset(event: PointerEvent<HTMLButtonElement>) {
        if (disabled) {
          onPointerMove?.(event);
          return;
        }

        const eyesRect = eyesRef.current?.getBoundingClientRect();

        if (!eyesRect) {
          onPointerMove?.(event);
          return;
        }

        const eyeCenterX = eyesRect.left + eyesRect.width / 2;
        const eyeCenterY = eyesRect.top + eyesRect.height / 2;
        const dx = event.clientX - eyeCenterX;
        const dy = event.clientY - eyeCenterY;
        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
          setEyeOffset({ x: 0, y: 0 });
          onPointerMove?.(event);
          return;
        }

        setEyeOffset({
          x: clamp(dx / 80, -1, 1),
          y: clamp(dy / 48, -1, 1),
        });
        onPointerMove?.(event);
      },
      [disabled, onPointerMove]
    );

    const pupilStyle: PupilStyle = {
      "--creepy-button-pupil-x": `${-50 + eyeOffset.x * 42}%`,
      "--creepy-button-pupil-y": `${-50 + eyeOffset.y * 42}%`,
      transform:
        "translate(var(--creepy-button-pupil-x), var(--creepy-button-pupil-y))",
    };

    return (
      <button
        ref={setButtonRef}
        type={type ?? "button"}
        disabled={disabled}
        className={cn(styles.root, className)}
        onPointerLeave={resetEyes}
        onPointerMove={updateEyes}
        {...props}
      >
        <span className={styles.eyes} ref={eyesRef} aria-hidden="true">
          <span className={styles.eye}>
            <span className={styles.pupil} style={pupilStyle} />
          </span>
          <span className={styles.eye}>
            <span className={styles.pupil} style={pupilStyle} />
          </span>
        </span>
        <span className={styles.cover}>{children}</span>
      </button>
    );
  }
);
