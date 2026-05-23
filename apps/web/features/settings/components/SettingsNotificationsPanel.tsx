"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SettingsSection, SettingsToggle } from "./SettingsFormPrimitives";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  notificationSettingsSchema,
  type NotificationSettingsFormValues,
  toFormErrorMessage,
} from "../schemas/settingsSchemas";
import type { NotificationSettings } from "../types/settings";

interface SettingsNotificationsPanelProps {
  initialValues: NotificationSettings;
  onSave: (values: NotificationSettingsFormValues) => Promise<void>;
}

export function SettingsNotificationsPanel({
  initialValues,
  onSave,
}: SettingsNotificationsPanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
    setSubmitError(null);
    setSaved(false);
  }, [initialValues, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    await onSave(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    reset(values);
  });

  return (
    <div className="space-y-10">
      <SettingsSection title="Notifications">
        <div className="space-y-0">
          <SettingsToggle
            label="New followers"
            checked={watch("newFollowers")}
            onChange={(checked) => setValue("newFollowers", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Likes on posts"
            checked={watch("likesOnPosts")}
            onChange={(checked) => setValue("likesOnPosts", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Comments & replies"
            checked={watch("commentsAndReplies")}
            onChange={(checked) => setValue("commentsAndReplies", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Mentions"
            checked={watch("mentions")}
            onChange={(checked) => setValue("mentions", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Festival updates"
            checked={watch("festivalUpdates")}
            onChange={(checked) => setValue("festivalUpdates", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Watchlist streaming"
            description="When films in your watchlist become available"
            checked={watch("watchlistStreaming")}
            onChange={(checked) => setValue("watchlistStreaming", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Email digest"
            description="Weekly summary of your activity"
            checked={watch("emailDigest")}
            onChange={(checked) => setValue("emailDigest", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          {submitError ? (
            <p className="pt-3 text-[12px] text-accent">{submitError}</p>
          ) : null}
          <div className="pt-6">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void submit().catch((error: unknown) => {
                  setSubmitError(
                    toFormErrorMessage(error, "Could not save notification settings.")
                  );
                });
              }}
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? "Saving…" : saved ? "Saved" : "Save changes"}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
