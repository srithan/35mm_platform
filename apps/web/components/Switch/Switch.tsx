"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  variant?: "blue" | "green" | "boo";
  "aria-label"?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  className,
  id,
  variant = "blue",
  "aria-label": ariaLabel,
}: SwitchProps) {
  const [toggledOnce, setToggledOnce] = useState(false);

  return (
    <label
      className={cn(
        styles.root,
        className
      )}
      data-disabled={disabled ? "true" : "false"}
      data-variant={variant}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={function (e) {
          setToggledOnce(true);
          onChange?.(e.target.checked);
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        data-toggled={toggledOnce ? "true" : "false"}
        className={styles.input}
      />
      <span aria-hidden className={styles.track}>
        <span className={styles.thumb} />
      </span>
    </label>
  );
}
