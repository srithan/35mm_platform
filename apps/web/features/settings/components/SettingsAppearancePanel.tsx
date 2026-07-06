"use client";

import { useEffect, useState } from "react";
import type { ThemeOption } from "@/lib/theme/ThemeProvider";
import { applyAccentColor } from "@/lib/theme/applyAccentColor";
import {
  SettingsSection,
  ThemePicker,
} from "./SettingsFormPrimitives";
import { AccentColorPicker } from "./AccentColorPicker";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
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

  const {
    watch,
    setValue,
    reset,
    getValues,
    formState: { isSubmitting },
  } = useForm<AppearanceSettingsFormValues>({
    resolver: standardSchemaResolver(appearanceSettingsSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
    setSubmitError(null);
  }, [initialValues, reset]);

  return (
    <div className="space-y-10">
      <SettingsSection title="Theme and color">
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
              <div className="shrink-0 lg:w-[12rem]">
                <h3 className="text-[13px] text-fg-light font-medium">Accent color</h3>
                <p className="mt-1 max-w-[13rem] text-[11.5px] leading-relaxed text-fg-muted">
                  Buttons, links, and highlights.
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
          {submitError ? (
            <p className="pt-1 text-[12px] text-accent">{submitError}</p>
          ) : null}
          {(isSavingTheme || isSavingAccentColor) && (
            <p className="text-[11px] text-fg-muted">Saving appearance changes...</p>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
