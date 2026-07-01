"use client";

import { cn } from "@/lib/utils/cn";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./WormRadioGroup.module.css";

const DEFAULT_SEGMENT_COUNT = 30;
const MIN_SEGMENT_COUNT = 8;
const MAX_SEGMENT_COUNT = 60;
const OPTION_STEP_REM = 2.75;

export interface WormRadioOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface WormRadioGroupProps {
  options: WormRadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  legend?: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  segmentCount?: number;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

type WormGroupStyle = CSSProperties & {
  "--worm-y": string;
};

type SegmentStyle = CSSProperties & {
  "--segment-delay": string;
};

function clampSegmentCount(count: number | undefined) {
  if (count === undefined || !Number.isFinite(count)) {
    return DEFAULT_SEGMENT_COUNT;
  }

  return Math.max(MIN_SEGMENT_COUNT, Math.min(MAX_SEGMENT_COUNT, Math.round(count)));
}

function getInitialValue(options: WormRadioOption[], defaultValue: string | undefined) {
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  return options[0]?.value ?? "";
}

export function WormRadioGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  legend,
  className,
  disabled = false,
  required = false,
  segmentCount,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: WormRadioGroupProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const radioName = name ?? `${baseId}-worm-radio`;
  const [internalValue, setInternalValue] = useState(function () {
    return getInitialValue(options, defaultValue);
  });
  const selectedValue = value ?? internalValue;
  const selectedIndex = Math.max(
    0,
    options.findIndex(function (option) {
      return option.value === selectedValue;
    })
  );
  const normalizedSegmentCount = clampSegmentCount(segmentCount);
  const segments = useMemo(
    function () {
      return Array.from({ length: normalizedSegmentCount }, function (_, index) {
        return index;
      });
    },
    [normalizedSegmentCount]
  );
  const groupStyle: WormGroupStyle = {
    "--worm-y": `${selectedIndex * OPTION_STEP_REM}rem`,
  };

  useEffect(
    function syncInternalValueWithOptions() {
      if (value !== undefined || options.length === 0) {
        return;
      }

      const hasSelectedOption = options.some(function (option) {
        return option.value === internalValue;
      });

      if (!hasSelectedOption) {
        setInternalValue(options[0].value);
      }
    },
    [internalValue, options, value]
  );

  if (options.length === 0) {
    return null;
  }

  return (
    <fieldset
      className={cn(styles.root, className)}
      disabled={disabled}
      style={groupStyle}
      data-worm-radio-group
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {/* Original static radio worm concept: https://codepen.io/frontend_trend/pen/Jjvyyyd */}
      {legend ? <legend className={styles.legend}>{legend}</legend> : null}
      <div className={styles.optionList}>
        {options.map(function (option, index) {
          const optionId = `${baseId}-option-${index}`;
          const isSelected = option.value === selectedValue;
          const isDisabled = disabled || option.disabled === true;

          return (
            <div className={styles.optionRow} key={option.value}>
              <input
                id={optionId}
                className={styles.input}
                type="radio"
                name={radioName}
                value={option.value}
                checked={isSelected}
                disabled={isDisabled}
                required={required}
                onChange={function () {
                  if (isDisabled) {
                    return;
                  }

                  if (value === undefined) {
                    setInternalValue(option.value);
                  }

                  onValueChange?.(option.value);
                }}
              />
              <label
                className={cn(
                  styles.label,
                  isSelected && styles.labelActive,
                  isDisabled && styles.labelDisabled
                )}
                htmlFor={optionId}
              >
                <span className={styles.marker} aria-hidden />
                <span className={styles.labelText}>{option.label}</span>
              </label>
            </div>
          );
        })}
        <div className={styles.worm} data-worm-radio-worm aria-hidden>
          {segments.map(function (segmentIndex) {
            const segmentStyle: SegmentStyle = {
              "--segment-delay": `${segmentIndex * 0.004}s`,
            };

            return (
              <span className={styles.segment} key={segmentIndex} style={segmentStyle}>
                <span className={styles.segmentDot} key={`${selectedValue}-${segmentIndex}`} />
              </span>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
