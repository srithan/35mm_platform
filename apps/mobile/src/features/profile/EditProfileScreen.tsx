import { isApiClientError } from "@35mm/api-client";
import {
  AppText,
  Avatar,
  Button,
  Chip,
  ConfirmationDialog,
  IconButton,
  LoadingState,
  Screen,
  StateSurface,
  TextField,
  useMobileUI,
} from "@35mm/mobile-ui";
import { spacing } from "@35mm/design-tokens";
import { usernameSchema } from "@35mm/validators/username";
import { dateOfBirthSchema } from "@35mm/validators/date-of-birth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter, type Href } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { authBootstrapKeys } from "@/features/auth/bootstrap/queryKeys";
import { useUsernameAvailability } from "@/features/auth/signup/useUsernameAvailability";
import { useApiClient } from "@/services/api";
import {
  fetchPublicProfile,
  presignProfileMedia,
  updateCurrentProfile,
  updateCurrentUsername,
} from "./api";
import type { PublicProfile } from "./contracts";
import { profileKeys } from "./queryKeys";

const BIO_MAX = 160;
const ROLE_CONTEXT_MAX = 25;
const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"]);
const ROLES = ["Cinephile", "Creator", "Critic", "Film Student", "Industry"] as const;

type RoleLabel = (typeof ROLES)[number];

interface EditDraft {
  readonly displayName: string;
  readonly username: string;
  readonly bio: string;
  readonly location: string;
  readonly website: string;
  readonly dateOfBirth: string;
  readonly role: RoleLabel;
  readonly roleContext: string;
  readonly avatarUrl: string | null;
  readonly coverUrl: string | null;
}

function normalizeRole(value: string | null | undefined): RoleLabel {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "creator") return "Creator";
  if (normalized === "critic" || normalized === "film critic") return "Critic";
  if (normalized === "film_student" || normalized === "film student") return "Film Student";
  if (normalized === "industry") return "Industry";
  return "Cinephile";
}

function draftFromProfile(profile: PublicProfile): EditDraft {
  const role = normalizeRole(profile.role);
  return {
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    website: profile.website ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    role,
    roleContext: role === "Cinephile" ? "" : profile.roleContext ?? "",
    avatarUrl: profile.avatarUrlLg ?? profile.avatarUrl,
    coverUrl: profile.coverUrl,
  };
}

function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function websiteError(value: string): string | null {
  if (value.trim().length === 0) return null;
  if (value.length > 200) return "URL is too long.";
  try {
    const url = new URL(normalizeWebsite(value));
    return url.protocol === "http:" || url.protocol === "https:" ? null : "Use an HTTP or HTTPS URL.";
  } catch {
    return "Enter a valid URL, like example.com.";
  }
}

function validateDraft(draft: EditDraft, initialUsername: string): Record<keyof EditDraft | "form", string | null> {
  const usernameResult = usernameSchema.safeParse(draft.username.trim());
  const dobResult = draft.dateOfBirth.trim().length === 0
    ? { success: true }
    : dateOfBirthSchema.safeParse(draft.dateOfBirth.trim());
  const roleContextRequired = draft.role !== "Cinephile" && draft.roleContext.trim().length === 0;
  return {
    displayName: draft.displayName.trim().length === 0
      ? "Display name is required."
      : draft.displayName.trim().length > 50
        ? "Display name must be 50 characters or less."
        : null,
    username: draft.username.trim().toLowerCase() === initialUsername
      ? null
      : usernameResult.success
        ? null
        : usernameResult.error.issues[0]?.message ?? "Enter a valid username.",
    bio: draft.bio.length > BIO_MAX ? "Bio must be 160 characters or less." : null,
    location: draft.location.length > 100 ? "Location must be 100 characters or less." : null,
    website: websiteError(draft.website),
    dateOfBirth: dobResult.success ? null : "Use a valid date of birth.",
    role: null,
    roleContext: draft.roleContext.length > ROLE_CONTEXT_MAX
      ? "Context must be 25 characters or less."
      : roleContextRequired
        ? "Add a short context for this role."
        : null,
    avatarUrl: null,
    coverUrl: null,
    form: null,
  };
}

function hasErrors(errors: Record<string, string | null>): boolean {
  return Object.values(errors).some(Boolean);
}

function selectedImage(asset: ImagePicker.ImagePickerAsset): {
  readonly uri: string;
  readonly contentType: string;
  readonly size: number;
} {
  const contentType = (asset.mimeType ?? "image/jpeg").toLowerCase();
  const file = new File(asset.uri);
  const size = Number.isSafeInteger(asset.fileSize) && asset.fileSize ? asset.fileSize : file.size;
  if (!IMAGE_TYPES.has(contentType)) {
    throw new Error("Choose a JPEG, PNG, WebP, GIF, AVIF, HEIC, or HEIF image.");
  }
  if (!file.exists || !Number.isSafeInteger(size) || size <= 0 || size > IMAGE_MAX_BYTES) {
    throw new Error("Profile images must be 12 MB or smaller.");
  }
  return { uri: asset.uri, contentType, size };
}

async function uploadProfileImage(input: {
  readonly client: ReturnType<typeof useApiClient>;
  readonly kind: "avatar" | "cover";
  readonly asset: ImagePicker.ImagePickerAsset;
}): Promise<string> {
  const image = selectedImage(input.asset);
  const presign = await presignProfileMedia(input.client, {
    kind: input.kind,
    contentLength: image.size,
    contentType: image.contentType,
  });
  const file = new File(image.uri);
  if (!file.exists || file.size !== image.size) {
    throw new Error("Selected image is no longer available. Choose it again.");
  }
  const response = await expoFetch(presign.uploadUrl, {
    body: file,
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": image.contentType,
    },
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error("Image upload failed. Try again.");
  }
  return presign.publicUrl;
}

export function EditProfileScreen({ username }: { readonly username: string }) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { theme } = useMobileUI();
  const normalizedUsername = username.trim().toLowerCase();
  const [draftOverride, setDraft] = useState<EditDraft | null>(null);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: profileKeys.detail(normalizedUsername),
    queryFn: ({ signal }) => fetchPublicProfile(client, normalizedUsername, signal),
    refetchOnMount: "always",
  });

  const initialDraft = useMemo(
    () => profileQuery.data ? draftFromProfile(profileQuery.data) : null,
    [profileQuery.data],
  );
  const draft = draftOverride ?? initialDraft;
  const usernameChanged = Boolean(draft && draft.username.trim().toLowerCase() !== normalizedUsername);
  const usernameAvailability = useUsernameAvailability(
    { request: client.request.bind(client) },
    usernameChanged && draft ? draft.username : "",
  );
  const errors = draft ? validateDraft(draft, normalizedUsername) : null;
  const dirty = Boolean(draft && initialDraft && JSON.stringify(draft) !== JSON.stringify(initialDraft));
  const canSave = Boolean(
    draft &&
    dirty &&
    errors &&
    !hasErrors(errors) &&
    (!usernameChanged || usernameAvailability.status === "available"),
  );

  const mediaMutation = useMutation({
    mutationFn: async (input: { readonly kind: "avatar" | "cover"; readonly asset: ImagePicker.ImagePickerAsset }) =>
      uploadProfileImage({ asset: input.asset, client, kind: input.kind }),
    onSuccess: (url, input) => {
      setDraft((current) => current ? { ...current, [input.kind === "avatar" ? "avatarUrl" : "coverUrl"]: url } : current);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Image upload failed.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: EditDraft) => {
      const nextRoleContext = input.role === "Cinephile" ? null : input.roleContext.trim();
      const profilePatch = await updateCurrentProfile(client, {
        displayName: input.displayName.trim(),
        bio: input.bio,
        location: input.location.trim() || null,
        website: input.website.trim() ? normalizeWebsite(input.website) : null,
        dateOfBirth: input.dateOfBirth.trim() || null,
        role: input.role,
        roleContext: nextRoleContext,
        headline: input.role,
        headlineContext: nextRoleContext,
        ...(initialDraft && input.avatarUrl !== initialDraft.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
        ...(initialDraft && input.coverUrl !== initialDraft.coverUrl ? { coverUrl: input.coverUrl } : {}),
      });
      let confirmedUsername = profilePatch.username;
      if (input.username.trim().toLowerCase() !== normalizedUsername) {
        confirmedUsername = await updateCurrentUsername(client, input.username.trim().toLowerCase());
      }
      return { profilePatch, username: confirmedUsername };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authBootstrapKeys.all }),
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
      ]);
      setFormError(null);
      router.replace(`/profile/${encodeURIComponent(result.username)}` as Href);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to save profile.");
    },
  });

  const chooseImage = async (kind: "avatar" | "cover") => {
    setFormError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError("Photo library permission is required to update profile images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: kind === "avatar" ? [1, 1] : [3, 1],
      mediaTypes: ["images"],
      quality: 0.92,
    });
    if (result.canceled || !result.assets[0]) return;
    mediaMutation.mutate({ asset: result.assets[0], kind });
  };

  const requestClose = () => {
    if (dirty && !saveMutation.isPending && !mediaMutation.isPending) {
      setDiscardVisible(true);
      return;
    }
    router.back();
  };

  if (profileQuery.isPending || !draft) {
    return (
      <Screen>
        <LoadingState label="Loading edit profile" />
      </Screen>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    const offline = isApiClientError(profileQuery.error) && ["network", "timeout"].includes(profileQuery.error.kind);
    return (
      <Screen padded>
        <StateSurface
          kind={offline ? "offline" : "error"}
          title="Couldn't load profile"
          primaryAction={{ label: "Try again", onPress: () => void profileQuery.refetch() }}
        />
      </Screen>
    );
  }

  if (profileQuery.data.followState !== "self") {
    return (
      <Screen padded>
        <StateSurface
          kind="unauthorized"
          title="Not your profile"
          message="Only the profile owner can edit these fields."
          primaryAction={{ label: "Go back", onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const usernameHint = !usernameChanged
    ? "This is your current profile URL."
    : usernameAvailability.status === "checking"
      ? "Checking availability..."
      : usernameAvailability.status === "available"
        ? "Username is available."
        : usernameAvailability.status === "unavailable" || usernameAvailability.status === "invalid" || usernameAvailability.status === "error"
          ? usernameAvailability.message
          : "Choose a public profile URL.";
  const usernameError = errors?.username ??
    (usernameChanged && usernameAvailability.status !== "available" ? usernameHint : null);
  const usernameMessage = usernameChanged && usernameAvailability.status === "available" ? usernameHint : null;

  return (
    <Screen safeAreaEdges={["top", "right", "bottom", "left"]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <IconButton icon="back" label="Cancel edit profile" onPress={requestClose} />
        <AppText accessibilityRole="header" role="sectionTitle" style={styles.headerTitle}>Edit profile</AppText>
        <Button
          label="Save"
          loading={saveMutation.isPending}
          onPress={() => draft && saveMutation.mutate(draft)}
          size="compact"
          disabled={!canSave || mediaMutation.isPending}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          testID="edit-profile-screen"
        >
          <View style={styles.mediaSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose cover photo"
              disabled={mediaMutation.isPending}
              onPress={() => void chooseImage("cover")}
              style={[styles.cover, { backgroundColor: theme.colors.surfaceSunken }]}
            >
              {draft.coverUrl ? <Image source={{ uri: draft.coverUrl }} style={styles.coverImage} /> : null}
              <View style={[styles.mediaOverlay, { backgroundColor: "rgba(0,0,0,0.38)" }]}>
                <AppText style={{ color: "#FFFFFF" }} role="rowLabelCompact">
                  {mediaMutation.isPending ? "Uploading..." : "Change cover"}
                </AppText>
              </View>
            </Pressable>
            <View style={[styles.avatarEditor, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose profile photo"
                disabled={mediaMutation.isPending}
                onPress={() => void chooseImage("avatar")}
              >
                <Avatar
                  avatarSize={72}
                  label="Profile photo preview"
                  {...(draft.avatarUrl ? { source: { uri: draft.avatarUrl } } : {})}
                />
              </Pressable>
              <View style={styles.avatarCopy}>
                <AppText numberOfLines={1} role="rowLabelCompact">{draft.displayName || "Your name"}</AppText>
                <AppText color="textSecondary" numberOfLines={1} role="metadata">@{draft.username || "username"}</AppText>
                <AppText color="textSecondary" role="metadata">Tap photo to update</AppText>
              </View>
            </View>
            <View style={styles.mediaButtons}>
              <Button
                label="Remove photo"
                onPress={() => setDraft({ ...draft, avatarUrl: null })}
                size="compact"
                variant="secondary"
                disabled={!draft.avatarUrl || saveMutation.isPending}
              />
              <Button
                label="Remove cover"
                onPress={() => setDraft({ ...draft, coverUrl: null })}
                size="compact"
                variant="secondary"
                disabled={!draft.coverUrl || saveMutation.isPending}
              />
            </View>
          </View>

          <FormSection title="Basics">
            <TextField
              autoComplete="name"
              label="Display name"
              onChangeText={(displayName) => setDraft({ ...draft, displayName })}
              placeholder="Your name"
              testID="edit-profile-display-name"
              value={draft.displayName}
              {...(errors?.displayName ? { errorMessage: errors.displayName } : {})}
            />
            <TextField
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              inputMode="text"
              label="Username"
              onChangeText={(usernameInput) => setDraft({ ...draft, username: usernameInput.trim().toLowerCase() })}
              placeholder="username"
              testID="edit-profile-username"
              value={draft.username}
              {...(usernameError ? { errorMessage: usernameError } : {})}
              {...(usernameMessage ? { message: usernameMessage } : {})}
            />
            <TextField
              autoComplete="birthdate-full"
              inputMode="numeric"
              keyboardType="number-pad"
              label="Date of birth"
              maxLength={10}
              message="Optional. Only visible to you. Use YYYY-MM-DD."
              onChangeText={(dateOfBirth) => setDraft({ ...draft, dateOfBirth })}
              placeholder="YYYY-MM-DD"
              value={draft.dateOfBirth}
              {...(errors?.dateOfBirth ? { errorMessage: errors.dateOfBirth } : {})}
            />
          </FormSection>

          <FormSection title="Profile label">
            <View accessibilityRole="radiogroup" accessibilityLabel="Profile role" style={styles.roles}>
              {ROLES.map((role) => (
                <Chip
                  accessibilityRole="radio"
                  key={role}
                  label={role}
                  onPress={() => setDraft({ ...draft, role, roleContext: role === "Cinephile" ? "" : draft.roleContext })}
                  selected={draft.role === role}
                />
              ))}
            </View>
            {draft.role !== "Cinephile" ? (
              <TextField
                label="Role context"
                maxLength={ROLE_CONTEXT_MAX}
                message={`${draft.roleContext.length}/${ROLE_CONTEXT_MAX}`}
                onChangeText={(roleContext) => setDraft({ ...draft, roleContext })}
                placeholder="Executive Producer, NYU..."
                value={draft.roleContext}
                {...(errors?.roleContext ? { errorMessage: errors.roleContext } : {})}
              />
            ) : null}
            <View style={[styles.bylinePreview, { backgroundColor: theme.colors.surfaceSunken }]}>
              <AppText color="accent" role="rowLabelCompact">
                {draft.role === "Cinephile" || draft.roleContext.trim().length === 0
                  ? draft.role
                  : `${draft.role} · ${draft.roleContext.trim()}`}
              </AppText>
            </View>
          </FormSection>

          <FormSection title="About">
            <TextField
              label="Bio"
              maxLength={BIO_MAX}
              message={`${draft.bio.length}/${BIO_MAX}`}
              multiline
              onChangeText={(bio) => setDraft({ ...draft, bio })}
              placeholder="Films, directors, hot takes..."
              textAlignVertical="top"
              value={draft.bio}
              {...(errors?.bio ? { errorMessage: errors.bio } : {})}
            />
          </FormSection>

          <FormSection title="Links and location">
            <TextField
              autoComplete="address-line1"
              label="Location"
              onChangeText={(location) => setDraft({ ...draft, location })}
              placeholder="Los Angeles"
              value={draft.location}
              {...(errors?.location ? { errorMessage: errors.location } : {})}
            />
            <TextField
              autoCapitalize="none"
              autoComplete="url"
              autoCorrect={false}
              inputMode="url"
              keyboardType="url"
              label="Website"
              message="https:// is added when omitted."
              onChangeText={(website) => setDraft({ ...draft, website })}
              placeholder="your-site.com"
              value={draft.website}
              {...(errors?.website ? { errorMessage: errors.website } : {})}
            />
          </FormSection>

          {formError || saveMutation.isError || mediaMutation.isError ? (
            <AppText accessibilityLiveRegion="assertive" color="destructive" role="metadata">
              {formError ?? "Save failed. Try again."}
            </AppText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmationDialog
        confirmLabel="Discard"
        destructive
        message="Unsaved profile changes will be lost."
        onCancel={() => setDiscardVisible(false)}
        onConfirm={() => router.back()}
        title="Discard changes?"
        visible={discardVisible}
      />
    </Screen>
  );
}

function FormSection({
  children,
  title,
}: {
  readonly children: ReactNode;
  readonly title: string;
}) {
  const { theme } = useMobileUI();
  return (
    <View style={styles.section}>
      <AppText role="sectionTitle">{title}</AppText>
      <View style={[styles.sectionBody, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export const editProfileTestInternals = {
  draftFromProfile,
  normalizeWebsite,
  validateDraft,
};

const styles = StyleSheet.create({
  avatarCopy: {
    flex: 1,
    gap: 3,
  },
  avatarEditor: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 14,
    marginHorizontal: 16,
    marginTop: -34,
    padding: 12,
  },
  bylinePreview: {
    borderRadius: 12,
    padding: 12,
  },
  content: {
    gap: 20,
    paddingBottom: 32,
  },
  cover: {
    height: 138,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  coverImage: {
    height: "100%",
    position: "absolute",
    width: "100%",
  },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 8,
  },
  headerTitle: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  mediaButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  mediaOverlay: {
    alignSelf: "flex-start",
    borderRadius: 999,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediaSection: {
    gap: 12,
  },
  roles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  section: {
    gap: 10,
    paddingHorizontal: spacing.screenHorizontal,
  },
  sectionBody: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    padding: 14,
  },
});
