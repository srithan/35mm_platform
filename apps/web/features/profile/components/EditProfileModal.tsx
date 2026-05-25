"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/Dialog/Dialog";
import { Button } from "@/components/Button";
import { Loader2, MapPin, Link2, User, AtSign, AlignLeft, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { fetchUsernameAvailability, updateCurrentProfile } from "../api/profileApi";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import { profileKeys } from "../hooks/queryKeys";

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50, "Name too long"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username too long")
    .regex(/^[a-zA-Z0-9_.]+$/, "Only letters, numbers, underscores and dots allowed"),
  bio: z.string().max(160, "Bio must be 160 characters or less"),
  location: z.string().max(100, "Location too long"),
  website: z.string().url("Must be a valid URL").or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProfileFormValues) => void;
  initialData: ProfileFormValues;
}

export function EditProfileModal({
  open,
  onClose,
  onSave,
  initialData,
}: EditProfileModalProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
    mode: "onBlur",
  });

  const bioContent = watch("bio") || "";
  const usernameValue = watch("username");

  useEffect(() => {
    if (open) {
      reset(initialData);
      setSaveError(null);
    }
  }, [open, initialData, reset]);

  useEffect(() => {
    if (!usernameValue || usernameValue === initialData.username) {
      return;
    }

    const checkAvailability = async () => {
      setIsCheckingUsername(true);
      try {
        const result = await fetchUsernameAvailability(usernameValue.toLowerCase());
        if (!result.available) {
          setError("username", { type: "manual", message: result.reason || "Username is already taken" });
        } else {
          clearErrors("username");
        }
      } catch (_err) {
        setError("username", { type: "manual", message: "Could not check username" });
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [usernameValue, initialData.username, setError, clearErrors]);

  const onSubmit = async (data: ProfileFormValues) => {
    setSaveError(null);
    try {
      const next = await updateCurrentProfile(data, await getToken());
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      onSave({
        displayName: next.displayName,
        username: next.username,
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
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit Profile"
      className="max-w-[480px]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
        {/* Name & Username Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider ml-1">
              Display Name
            </label>
            <div className="relative group">
              <User className={cn(
                "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                errors.displayName ? "text-red-500" : "text-fg-muted/50 group-focus-within:text-accent"
              )} />
              <input
                {...register("displayName")}
                type="text"
                placeholder="Name"
                className={cn(
                  "w-full bg-sunken-2 dark:bg-elevated border rounded-xl pl-10 pr-4 py-2.5 text-[16px] md:text-sm font-medium transition-all outline-none",
                  errors.displayName 
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10" 
                    : "border-border focus:border-accent focus:ring-2 focus:ring-accent/10"
                )}
              />
            </div>
            {errors.displayName && (
              <p className="text-[10px] text-red-500 ml-1 uppercase tracking-tight">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider ml-1">
              Username
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center">
                <AtSign className={cn(
                  "w-4 h-4 transition-colors",
                  errors.username ? "text-red-500" : "text-fg-muted/50 group-focus-within:text-accent"
                )} />
              </div>
              <input
                {...register("username")}
                type="text"
                placeholder="username"
                className={cn(
                  "w-full bg-sunken-2 dark:bg-elevated border rounded-xl pl-10 pr-10 py-2.5 text-[16px] md:text-sm transition-all outline-none",
                  errors.username 
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10" 
                    : "border-border focus:border-accent focus:ring-2 focus:ring-accent/10"
                )}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                {isCheckingUsername ? (
                  <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                ) : usernameValue && usernameValue !== initialData.username && !errors.username ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : errors.username ? (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                ) : null}
              </div>
            </div>
            {errors.username && (
              <p className="text-[10px] text-red-500 ml-1 uppercase tracking-tight">
                {errors.username.message}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider ml-1 flex justify-between">
            <span>Bio</span>
            <span className={cn(
              " text-[9px] lowercase",
              bioContent.length > 160 ? "text-red-500" : "text-fg-muted/50"
            )}>
              {bioContent.length}/160
            </span>
          </label>
          <div className="relative group">
            <AlignLeft className={cn(
              "absolute left-3.5 top-4 w-4 h-4 transition-colors",
              errors.bio ? "text-red-500" : "text-fg-muted/50 group-focus-within:text-accent"
            )} />
            <textarea
              {...register("bio")}
              placeholder="Tell us about yourself..."
              rows={3}
              className={cn(
                "w-full bg-sunken-2 dark:bg-elevated border rounded-xl pl-10 pr-4 py-3 text-[16px] md:text-sm leading-relaxed transition-all outline-none resize-none",
                errors.bio 
                  ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10" 
                  : "border-border focus:border-accent focus:ring-2 focus:ring-accent/10"
              )}
            />
          </div>
          {errors.bio && (
            <p className="text-[10px] text-red-500 ml-1 uppercase tracking-tight">
              {errors.bio.message}
            </p>
          )}
        </div>

        {/* Location & Website Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider ml-1">
              Location
            </label>
            <div className="relative group">
              <MapPin className={cn(
                "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                errors.location ? "text-red-500" : "text-fg-muted/50 group-focus-within:text-accent"
              )} />
              <input
                {...register("location")}
                type="text"
                placeholder="Location"
                className={cn(
                  "w-full bg-sunken-2 dark:bg-elevated border rounded-xl pl-10 pr-4 py-2.5 text-[16px] md:text-sm transition-all outline-none",
                  errors.location 
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10" 
                    : "border-border focus:border-accent focus:ring-2 focus:ring-accent/10"
                )}
              />
            </div>
            {errors.location && (
              <p className="text-[10px] text-red-500 ml-1 uppercase tracking-tight">
                {errors.location.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider ml-1">
              Website
            </label>
            <div className="relative group">
              <Link2 className={cn(
                "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                errors.website ? "text-red-500" : "text-fg-muted/50 group-focus-within:text-accent"
              )} />
              <input
                {...register("website")}
                type="text"
                placeholder="https://yourwebsite.com"
                className={cn(
                  "w-full bg-sunken-2 dark:bg-elevated border rounded-xl pl-10 pr-4 py-2.5 text-[16px] md:text-sm transition-all outline-none",
                  errors.website 
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10" 
                    : "border-border focus:border-accent focus:ring-2 focus:ring-accent/10"
                )}
              />
            </div>
            {errors.website && (
              <p className="text-[10px] text-red-500 ml-1 uppercase tracking-tight">
                {errors.website.message}
              </p>
            )}
          </div>
        </div>

        {saveError ? (
          <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] font-medium text-film-red">
            {saveError}
          </p>
        ) : null}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-6 rounded-full font-bold text-xs uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty || isCheckingUsername || isSubmitting}
            className="px-8 rounded-full font-bold text-xs uppercase tracking-wider disabled:opacity-50"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
