"use client";

import { useEffect, useState } from "react";
import type { ThemeOption } from "@/lib/theme/ThemeProvider";
import { applyAccentColor } from "@/lib/theme/applyAccentColor";
import {
  SettingsRow,
  SettingsSection,
  ThemePicker,
} from "./SettingsFormPrimitives";
import { AccentColorPicker } from "./AccentColorPicker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  appearanceSettingsSchema,
  type AppearanceSettingsFormValues,
  toFormErrorMessage,
} from "../schemas/settingsSchemas";
import type { AppearanceSettings } from "../types/settings";

interface SettingsAppearancePanelProps {
  initialValues: AppearanceSettings;
  setTheme: (theme: ThemeOption) => void;
  onSave: (values: AppearanceSettingsFormValues) => Promise<void>;
}

export function SettingsAppearancePanel({
  initialValues,
  setTheme,
  onSave,
}: SettingsAppearancePanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingAccentColor, setIsSavingAccentColor] = useState(false);
  const [isSavingVideoAutoplay, setIsSavingVideoAutoplay] = useState(false);

  const {
    watch,
    setValue,
    reset,
    getValues,
    formState: { isSubmitting },
  } = useForm<AppearanceSettingsFormValues>({
    resolver: zodResolver(appearanceSettingsSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
    setSubmitError(null);
  }, [initialValues, reset]);

  return (
    <div className="space-y-10">
      <SettingsSection title="Appearance">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <h3 className="text-[13px] text-fg-light font-medium shrink-0">
              Theme
            </h3>
            <ThemePicker
              value={watch("theme")}
              onChange={(nextTheme) => void (async () => {
                if (nextTheme === watch("theme")) return;
                setTheme(nextTheme);
                setValue("theme", nextTheme, { shouldDirty: true });
                setSubmitError(null);
                setIsSavingTheme(true);
                const nextValues: AppearanceSettingsFormValues = {
                  ...getValues(),
                  theme: nextTheme,
                };
                try {
                  await onSave(nextValues);
                  reset(nextValues);
                } catch (error: unknown) {
                  setSubmitError(
                    toFormErrorMessage(error, "Could not update theme.")
                  );
                } finally {
                  setIsSavingTheme(false);
                }
              })()}
            />
          </div>
          <div className="mt-6 border-t border-border pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-[13px] text-fg-light font-medium">Accent color</h3>
                <p className="mt-1 text-[11.5px] text-fg-muted">
                  Applies to buttons, links, and highlights across all themes.
                </p>
              </div>
              <AccentColorPicker
                value={watch("accentColor")}
                disabled={isSubmitting || isSavingAccentColor}
                onChange={(nextAccentColor) => void (async () => {
                  if (nextAccentColor === watch("accentColor")) return;
                  applyAccentColor(nextAccentColor);
                  setValue("accentColor", nextAccentColor, { shouldDirty: true });
                  setSubmitError(null);
                  setIsSavingAccentColor(true);
                  const nextValues: AppearanceSettingsFormValues = {
                    ...getValues(),
                    accentColor: nextAccentColor,
                  };
                  try {
                    await onSave(nextValues);
                    reset(nextValues);
                  } catch (error: unknown) {
                    applyAccentColor(initialValues.accentColor);
                    setValue("accentColor", initialValues.accentColor);
                    setSubmitError(
                      toFormErrorMessage(error, "Could not update accent color.")
                    );
                  } finally {
                    setIsSavingAccentColor(false);
                  }
                })()}
              />
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-6">
            <SettingsRow
              label="Video autoplay"
              description="Auto-play videos in feed"
              action={
                <label className="relative w-[30px] h-[17px] flex-shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watch("videoAutoplay")}
                    onChange={(e) => void (async () => {
                      const nextVideoAutoplay = e.target.checked;
                      setValue("videoAutoplay", nextVideoAutoplay, { shouldDirty: true });
                      setSubmitError(null);
                      setIsSavingVideoAutoplay(true);
                      const nextValues: AppearanceSettingsFormValues = {
                        ...getValues(),
                        videoAutoplay: nextVideoAutoplay,
                      };
                      try {
                        await onSave(nextValues);
                        reset(nextValues);
                      } catch (error: unknown) {
                        setSubmitError(
                          toFormErrorMessage(error, "Could not update video autoplay.")
                        );
                      } finally {
                        setIsSavingVideoAutoplay(false);
                      }
                    })()}
                    disabled={isSubmitting || isSavingVideoAutoplay}
                    className="sr-only peer"
                  />
                  <div className="absolute inset-0 rounded-[17px] border border-border-strong bg-sunken-2 peer-checked:border-accent peer-checked:bg-accent transition-colors" />
                  <div className="absolute top-[2.5px] left-[2.5px] w-3 h-3 rounded-full bg-bg border border-border shadow-sm transition-transform peer-checked:translate-x-[13px] peer-checked:border-transparent" />
                </label>
              }
            />
          </div>
          {submitError ? (
            <p className="pt-1 text-[12px] text-accent">{submitError}</p>
          ) : null}
          {(isSavingTheme || isSavingAccentColor || isSavingVideoAutoplay) && (
            <p className="text-[11px] text-fg-muted">Saving appearance changes...</p>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
