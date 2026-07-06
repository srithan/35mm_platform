"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils/cn";
import {
  SettingsSection,
  SettingsToggle,
} from "./SettingsFormPrimitives";
import {
  mediaSettingsSchema,
  toFormErrorMessage,
  type MediaSettingsFormValues,
} from "../schemas/settingsSchemas";
import type {
  MediaSettings,
  VideoCaptionStyle,
  VideoDefaultQuality,
} from "../types/settings";

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

const QUALITY_OPTIONS: SelectOption<VideoDefaultQuality>[] = [
  { value: "auto", label: "Auto" },
  { value: "data_saver", label: "Data saver" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
];

const CAPTION_STYLE_OPTIONS: SelectOption<VideoCaptionStyle>[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large text" },
  { value: "high_contrast", label: "High contrast" },
];

interface SettingsMediaPanelProps {
  initialValues: MediaSettings;
  onSave: (values: MediaSettingsFormValues) => Promise<void>;
}

function MediaSelectRow<T extends string>({
  label,
  description,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: SelectOption<T>[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0 sm:items-center">
      <div className="min-w-0">
        <span className="block text-[13px] text-fg-light">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11.5px] text-fg-muted">
            {description}
          </span>
        ) : null}
      </div>
      <div className="relative shrink-0">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as T)}
          className={cn(
            "h-9 min-w-[9.5rem] appearance-none rounded-lg border border-border bg-bg py-0 pl-3 pr-8 text-[12.5px] font-medium text-fg outline-none transition-colors focus:border-border-strong",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-hover"
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted"
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function SettingsMediaPanel({
  initialValues,
  onSave,
}: SettingsMediaPanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    watch,
    setValue,
    reset,
    getValues,
  } = useForm<MediaSettingsFormValues>({
    resolver: standardSchemaResolver(mediaSettingsSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
    setSubmitError(null);
  }, [initialValues, reset]);

  async function saveValues(nextValues: MediaSettingsFormValues, fallback: string) {
    setSubmitError(null);
    setIsSaving(true);
    try {
      await onSave(nextValues);
      reset(nextValues);
    } catch (error: unknown) {
      reset(initialValues);
      setSubmitError(toFormErrorMessage(error, fallback));
    } finally {
      setIsSaving(false);
    }
  }

  function updateMediaValue<K extends keyof MediaSettingsFormValues>(
    key: K,
    value: MediaSettingsFormValues[K],
    fallback: string
  ) {
    if (watch(key) === value || isSaving) return;
    const nextValues: MediaSettingsFormValues = {
      ...getValues(),
      [key]: value,
    };
    setValue(key, value as any, { shouldDirty: true });
    void saveValues(nextValues, fallback);
  }

  return (
    <div className="space-y-10">
      <SettingsSection title="Video">
        <div>
          <MediaSelectRow
            label="Video default quality"
            description="Choose playback quality for feed videos and short films."
            value={watch("videoDefaultQuality")}
            options={QUALITY_OPTIONS}
            disabled={isSaving}
            onChange={(value) =>
              updateMediaValue(
                "videoDefaultQuality",
                value,
                "Could not update video quality."
              )
            }
          />
          <SettingsToggle
            label="Autoplay"
            description="Automatically play videos in feed and short-film surfaces."
            checked={watch("videoAutoplay")}
            onChange={(checked) =>
              updateMediaValue("videoAutoplay", checked, "Could not update autoplay.")
            }
            disabled={isSaving}
          />
          <SettingsToggle
            label="Always show captions"
            description="Show captions by default when a video includes them."
            checked={watch("alwaysShowCaptions")}
            onChange={(checked) =>
              updateMediaValue(
                "alwaysShowCaptions",
                checked,
                "Could not update captions."
              )
            }
            disabled={isSaving}
          />
          <MediaSelectRow
            label="Captions display"
            description="Choose default caption styling."
            value={watch("captionStyle")}
            options={CAPTION_STYLE_OPTIONS}
            disabled={isSaving}
            onChange={(value) =>
              updateMediaValue(
                "captionStyle",
                value,
                "Could not update caption display."
              )
            }
          />
          <SettingsToggle
            label="Quiet mode"
            description="Start videos at a lower volume when sound is enabled."
            checked={watch("quietMode")}
            onChange={(checked) =>
              updateMediaValue("quietMode", checked, "Could not update quiet mode.")
            }
            disabled={isSaving}
          />
        </div>
        {submitError ? (
          <p className="pt-3 text-[12px] text-accent">{submitError}</p>
        ) : null}
        {isSaving ? (
          <p className="pt-3 text-[11px] text-fg-muted">Saving media settings...</p>
        ) : null}
      </SettingsSection>
    </div>
  );
}
