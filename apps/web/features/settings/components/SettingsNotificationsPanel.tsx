"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SettingsToggle } from "./SettingsFormPrimitives";
import { Bell, ChevronDown, Mail, Smartphone } from "lucide-react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
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

function NotificationAccordion({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-border bg-sunken"
      open
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 bg-[linear-gradient(135deg,var(--elevated)_0%,color-mix(in_srgb,var(--sunken)_96%,var(--accent)_4%)_100%)] px-4 py-3.5 transition-[filter] hover:brightness-[0.992] [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg text-fg shadow-sm"
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold tracking-tight text-fg">
            {title}
          </span>
          <span className="block text-[12px] leading-relaxed text-fg-muted">
            {description}
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-open:rotate-180"
          strokeWidth={2}
          aria-hidden
        />
      </summary>
      <div className="border-t border-border bg-elevated px-4">
        {children}
      </div>
    </details>
  );
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
    resolver: standardSchemaResolver(notificationSettingsSchema),
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
    <div className="space-y-5">
      <NotificationAccordion
        title="Activity"
        description="Events that appear in your notification center."
        icon={<Bell className="h-5 w-5" strokeWidth={1.9} />}
      >
        <div>
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
        </div>
      </NotificationAccordion>

      <NotificationAccordion
        title="Email"
        description="Messages sent to your account email."
        icon={<Mail className="h-5 w-5" strokeWidth={1.9} />}
      >
        <div>
          <SettingsToggle
            label="Email digest"
            description="Weekly summary of your activity"
            checked={watch("emailDigest")}
            onChange={(checked) => setValue("emailDigest", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="New followers"
            checked={watch("emailPreferences.newFollowers")}
            onChange={(checked) => setValue("emailPreferences.newFollowers", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Follow requests"
            checked={watch("emailPreferences.followRequests")}
            onChange={(checked) => setValue("emailPreferences.followRequests", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Accepted follow requests"
            checked={watch("emailPreferences.followRequestApproved")}
            onChange={(checked) => setValue("emailPreferences.followRequestApproved", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Comments"
            checked={watch("emailPreferences.comments")}
            onChange={(checked) => setValue("emailPreferences.comments", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Replies"
            checked={watch("emailPreferences.replies")}
            onChange={(checked) => setValue("emailPreferences.replies", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Mentions"
            checked={watch("emailPreferences.mentions")}
            onChange={(checked) => setValue("emailPreferences.mentions", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Likes on posts"
            checked={watch("emailPreferences.likesOnPosts")}
            onChange={(checked) => setValue("emailPreferences.likesOnPosts", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Reposts"
            checked={watch("emailPreferences.repostsOnPosts")}
            onChange={(checked) => setValue("emailPreferences.repostsOnPosts", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
          <SettingsToggle
            label="Shared film logs"
            checked={watch("emailPreferences.filmLogged")}
            onChange={(checked) => setValue("emailPreferences.filmLogged", checked, { shouldDirty: true })}
            disabled={isSubmitting}
          />
        </div>
      </NotificationAccordion>

      <NotificationAccordion
        title="Mobile App Push"
        description="Time-sensitive alerts for the native app."
        icon={<Smartphone className="h-5 w-5" strokeWidth={1.9} />}
      >
        <div>
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
        </div>
      </NotificationAccordion>

      {submitError ? (
        <p className="text-[12px] text-accent">{submitError}</p>
      ) : null}
      <div className="pt-1">
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
  );
}
