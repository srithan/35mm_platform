"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/Dialog/Dialog";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { DatePicker } from "@/components/DatePicker/DatePicker";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/constants/routes";
import { updateCurrentProfile } from "../api/profileApi";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import { profileKeys } from "../hooks/queryKeys";

const BIO_MAX = 160;
const ROLE_CONTEXT_MAX = 25;

const PROFILE_ROLE_OPTIONS = [
  {
    value: "Cinephile",
    description: "You primarily watch, log, and talk about films.",
  },
  {
    value: "Creator",
    description: "You make films, videos, or visual work.",
  },
  {
    value: "Critic",
    description: "You review, write, podcast, or publish film criticism.",
  },
  {
    value: "Film Student",
    description: "You are studying film or learning the craft.",
  },
  {
    value: "Industry",
    description: "You work in production, distribution, festivals, or studios.",
  },
] as const;

type ProfileRoleLabel = (typeof PROFILE_ROLE_OPTIONS)[number]["value"];

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Name must be 50 characters or less"),
  dateOfBirth: z
    .string()
    .refine(function (value) {
      return value.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(value);
    }, "Use a valid date"),
  role: z.string().trim().min(1, "Choose a role").max(50, "Role is too long"),
  roleContext: z.string().trim().max(ROLE_CONTEXT_MAX, "Context is too long"),
  bio: z.string().max(BIO_MAX, "Bio must be 160 characters or less"),
  location: z.string().max(100, "Location must be 100 characters or less"),
  website: z.string().max(200, "URL is too long"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProfileFormValues) => void;
  initialData: ProfileFormValues;
  username: string;
  avatarUrl: string | null;
  onAvatarChange?: (imageUrl: string | null) => void;
}

function normalizeWebsite(value: string): string {
  var trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

function isValidWebsite(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(normalizeWebsite(value));
    return true;
  } catch (_error) {
    return false;
  }
}

function normalizeRoleLabel(value: string | null | undefined): ProfileRoleLabel {
  var normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "creator") return "Creator";
  if (normalized === "critic" || normalized === "film critic") return "Critic";
  if (normalized === "film_student" || normalized === "film student") return "Film Student";
  if (normalized === "industry") return "Industry";
  return "Cinephile";
}

function normalizeInitialValues(values: ProfileFormValues): ProfileFormValues {
  var role = normalizeRoleLabel(values.role);
  return {
    ...values,
    role,
    roleContext: role === "Cinephile" ? "" : values.roleContext.trim().slice(0, ROLE_CONTEXT_MAX),
  };
}

function EditProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-[13px] font-semibold tracking-tight text-fg">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EditProfileField({
  id,
  label,
  hint,
  error,
  children,
  meta,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3.5",
        error && "bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--sunken))]"
      )}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12px] font-medium text-fg-muted">
          {label}
        </label>
        {meta}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-[11.5px] text-accent" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const fieldGroupClassName =
  "edit-profile-field-group overflow-hidden rounded-2xl border border-border bg-sunken divide-y divide-border";

const profileSummaryClassName =
  "edit-profile-field-group flex items-center gap-4 rounded-2xl border border-border bg-sunken px-4 py-3.5";

const inputClassName =
  "edit-profile-input w-full border-0 bg-transparent p-0 text-[15px] leading-snug text-fg shadow-none outline-none ring-0 placeholder:text-fg-faint focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60";

function inputStateClassName(hasError: boolean) {
  return cn(inputClassName, hasError && "placeholder:text-accent/40");
}

export function EditProfileModal({
  open,
  onClose,
  onSave,
  initialData,
  username,
  avatarUrl,
  onAvatarChange,
}: EditProfileModalProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const displayNameRef = useRef<HTMLInputElement | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting, isValid },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: normalizeInitialValues(initialData),
    mode: "onChange",
  });

  const displayNameField = register("displayName");

  const bioContent = watch("bio") || "";
  const bioRemaining = BIO_MAX - bioContent.length;
  const roleValue = normalizeRoleLabel(watch("role"));
  const roleContextValue = watch("roleContext") || "";
  const roleContextTrimmed = roleContextValue.trim();
  const roleContextRemaining = ROLE_CONTEXT_MAX - roleContextValue.length;
  const roleBylinePreview =
    roleValue === "Cinephile" || roleContextTrimmed.length === 0
      ? roleValue
      : `${roleValue} · ${roleContextTrimmed}`;

  useEffect(function () {
    if (open) {
      reset(normalizeInitialValues(initialData));
      setSaveError(null);
      setWebsiteError(null);
      setDiscardConfirmOpen(false);
    }
  }, [open, initialData, reset]);

  function requestClose() {
    if (isDirty && !isSubmitting) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }

  const onSubmit = async function (data: ProfileFormValues) {
    setSaveError(null);
    setWebsiteError(null);

    if (!isValidWebsite(data.website)) {
      setWebsiteError("Enter a valid URL, like example.com");
      return;
    }

    try {
      const nextWebsite = normalizeWebsite(data.website);
      const nextRole = normalizeRoleLabel(data.role);
      const nextRoleContext =
        nextRole === "Cinephile" ? null : data.roleContext.trim() || null;
      const next = await updateCurrentProfile(
        {
          displayName: data.displayName.trim(),
          bio: data.bio,
          location: data.location.trim(),
          website: nextWebsite.length > 0 ? nextWebsite : null,
          dateOfBirth: data.dateOfBirth.trim().length > 0 ? data.dateOfBirth : null,
          role: nextRole,
          roleContext: nextRoleContext,
          headline: nextRole,
          headlineContext: nextRoleContext,
        },
        await getToken()
      );
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      onSave({
        displayName: next.displayName,
        dateOfBirth: next.dateOfBirth ?? "",
        role: next.role ?? "Cinephile",
        roleContext: next.roleContext ?? "",
        bio: next.bio ?? "",
        location: next.location ?? "",
        website: next.website ?? "",
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        title="Edit profile"
        description="Update how you appear across 35mm."
        className="max-w-xl"
        contentClassName="flex max-h-[min(44rem,calc(100vh-5.5rem))] flex-col !p-0"
        initialFocusRef={displayNameRef}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="edit-profile-form min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <div className={profileSummaryClassName}>
              <ProfilePictureUpload onUploadComplete={onAvatarChange}>
                <Avatar
                  initial={(watch("displayName") || username)[0]}
                  src={avatarUrl}
                  size="lg"
                  className="h-[4.5rem] w-[4.5rem] shrink-0 text-[24px]"
                />
              </ProfilePictureUpload>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold tracking-tight text-fg">
                  {watch("displayName") || "Your name"}
                </p>
                <p className="truncate text-[13px] text-fg-muted">@{username}</p>
                <p className="mt-1 text-[12px] text-fg-muted">
                  Tap photo to update
                </p>
              </div>
            </div>

            <EditProfileSection title="Basics">
              <div className={fieldGroupClassName}>
              <EditProfileField
                id="edit-profile-display-name"
                label="Display name"
                hint="Shown on your posts, reviews, and profile."
                error={errors.displayName?.message}
              >
                <input
                  {...displayNameField}
                  ref={function (element) {
                    displayNameField.ref(element);
                    displayNameRef.current = element;
                  }}
                  id="edit-profile-display-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.displayName)}
                  className={inputStateClassName(Boolean(errors.displayName))}
                />
              </EditProfileField>

              <EditProfileField
                id="edit-profile-username"
                label="Username"
                hint={
                  <>
                    Change in{" "}
                    <Link
                      href={ROUTES.SETTINGS}
                      className="font-medium text-fg underline decoration-border underline-offset-2 transition-colors hover:decoration-fg-muted"
                      onClick={onClose}
                    >
                      Settings
                    </Link>
                  </>
                }
              >
                <p className="text-[15px] text-fg tabular-nums">@{username}</p>
              </EditProfileField>

              <EditProfileField
                id="edit-profile-dob"
                label="Date of birth"
                hint="Optional. Only visible to you."
                error={errors.dateOfBirth?.message}
              >
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={function ({ field }) {
                    return (
                      <DatePicker
                        id="edit-profile-dob"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                        placeholder="Select date"
                        aria-invalid={Boolean(errors.dateOfBirth)}
                      />
                    );
                  }}
                />
              </EditProfileField>
              </div>
            </EditProfileSection>

            <EditProfileSection
              title="Profile label"
              description="Choose the label people see under your name."
            >
              <div className={fieldGroupClassName}>
                <div className="px-4 py-3.5">
                  <div className="mb-3">
                    <p className="text-[12px] font-semibold text-fg">
                      Pick one role
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-muted">
                      This becomes your primary byline on your profile and posts.
                    </p>
                  </div>
                  <div
                    id="edit-profile-role"
                    role="radiogroup"
                    aria-label="Pick one role"
                    className="space-y-2"
                  >
                    {PROFILE_ROLE_OPTIONS.map(function (option) {
                      var selected = roleValue === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={isSubmitting}
                          onClick={function () {
                            setValue("role", option.value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            if (option.value === "Cinephile") {
                              setValue("roleContext", "", {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                            selected
                              ? "border-accent/45 bg-[color-mix(in_srgb,var(--color-film-red)_7%,var(--bg))] text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-film-red)_20%,transparent)]"
                              : "border-border bg-bg/55 text-fg-muted hover:border-border-strong hover:bg-bg"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                              selected
                                ? "border-accent bg-accent"
                                : "border-border-strong bg-transparent"
                            )}
                            aria-hidden
                          >
                            {selected ? (
                              <span className="h-2 w-2 rounded-full bg-bg" />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-[13.5px] font-semibold leading-5 text-fg">
                                {option.value}
                              </span>
                              {selected ? (
                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-accent">
                                  Selected
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-relaxed text-fg-muted">
                              {option.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.role?.message ? (
                    <p className="mt-2 text-[11.5px] text-accent" role="alert">
                      {errors.role.message}
                    </p>
                  ) : null}
                </div>

              {roleValue !== "Cinephile" ? (
                <EditProfileField
                  id="edit-profile-role-context"
                  label="Add detail"
                  hint={`This appears after your role: ${roleValue} · Executive Producer`}
                  error={errors.roleContext?.message}
                  meta={
                    <span
                      className={cn(
                        "text-[11px] tabular-nums text-fg-muted",
                        roleContextRemaining < 0 && "text-accent"
                      )}
                      aria-live="polite"
                    >
                      {roleContextValue.length}/{ROLE_CONTEXT_MAX}
                    </span>
                  }
                >
                  <input
                    {...register("roleContext")}
                    id="edit-profile-role-context"
                    type="text"
                    maxLength={ROLE_CONTEXT_MAX}
                    placeholder="Executive Producer, NYU, Sight & Sound..."
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.roleContext)}
                    className={inputStateClassName(Boolean(errors.roleContext))}
                  />
                </EditProfileField>
              ) : null}
                <div className="px-4 py-3.5">
                  <p className="text-[12px] font-medium text-fg-muted">
                    Your byline will show
                  </p>
                  <p className="mt-1 rounded-xl border border-border bg-bg px-3 py-2 text-[13.5px] font-semibold text-fg">
                    {roleBylinePreview}
                  </p>
                </div>
              </div>
            </EditProfileSection>

            <EditProfileSection
              title="About"
              description="A short line under your name on your profile."
            >
              <div className={fieldGroupClassName}>
              <EditProfileField
                id="edit-profile-bio"
                label="Bio"
                error={errors.bio?.message}
                meta={
                  <span
                    className={cn(
                      "text-[11px] tabular-nums text-fg-muted",
                      bioRemaining < 0 && "text-accent"
                    )}
                    aria-live="polite"
                  >
                    {bioContent.length}/{BIO_MAX}
                  </span>
                }
              >
                <textarea
                  {...register("bio")}
                  id="edit-profile-bio"
                  rows={3}
                  placeholder="Films, directors, hot takes…"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.bio)}
                  className={cn(
                    inputStateClassName(Boolean(errors.bio)),
                    "min-h-[4.5rem] resize-none leading-relaxed"
                  )}
                />
              </EditProfileField>
              </div>
            </EditProfileSection>

            <EditProfileSection title="Links & location">
              <div className={fieldGroupClassName}>
              <EditProfileField
                id="edit-profile-location"
                label="Location"
                hint="City and state/region only — country helps pick the right place but isn’t saved."
                error={errors.location?.message}
              >
                <Controller
                  name="location"
                  control={control}
                  render={function ({ field }) {
                    return (
                      <LocationAutocomplete
                        id="edit-profile-location"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                        placeholder="Los Angeles, CA, United States"
                        aria-invalid={Boolean(errors.location)}
                      />
                    );
                  }}
                />
              </EditProfileField>

              <EditProfileField
                id="edit-profile-website"
                label="Website"
                hint="We'll add https:// if you leave it out."
                error={websiteError ?? errors.website?.message}
              >
                <input
                  {...register("website")}
                  id="edit-profile-website"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="your-site.com"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(websiteError || errors.website)}
                  className={inputStateClassName(Boolean(websiteError || errors.website))}
                />
              </EditProfileField>
              </div>
            </EditProfileSection>

            {saveError ? (
              <p
                className="rounded-2xl border border-[color-mix(in_srgb,var(--color-film-red)_24%,var(--border))] bg-[color-mix(in_srgb,var(--color-film-red)_8%,var(--sunken))] px-4 py-3 text-[12.5px] leading-relaxed text-film-red"
                role="alert"
              >
                {saveError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-bg px-5 py-3.5 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={requestClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!isDirty || isSubmitting || !isValid || bioRemaining < 0}
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={discardConfirmOpen}
        onClose={function () {
          setDiscardConfirmOpen(false);
        }}
        onConfirm={function () {
          setDiscardConfirmOpen(false);
          reset(normalizeInitialValues(initialData));
          onClose();
        }}
        title="Discard changes?"
        description="You have unsaved edits. If you leave now, they'll be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="danger"
      />
    </>
  );
}
