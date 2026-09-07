import {
  AppText,
  Button,
  Chip,
  IconButton,
  ModalSurface,
  TextField,
  useMobileUI,
  useToast,
} from "@35mm/mobile-ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView, type VideoViewProps } from "expo-video";
import { useState, type ComponentType } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useApiClient } from "@/services/api";
import { reportMobileDiagnostic } from "@/services/diagnostics";
import { createVideoPost } from "./api";
import { videoPostKeys } from "./queryKeys";
import { clearVideoUploadRecovery, validateSelectedPostVideo, type SelectedPostVideo } from "./upload";
import { useDraftVideoUpload } from "./useDraftVideoUpload";

type Visibility = "public" | "followers_only" | "private";
const CompatibleVideoView = VideoView as unknown as ComponentType<VideoViewProps>;

function LocalVideoPreview({ video }: { readonly video: SelectedPostVideo }) {
  const player = useVideoPlayer(video.uri, (instance) => {
    instance.muted = true;
    instance.allowsExternalPlayback = false;
  });
  const ratio = video.width && video.height ? video.width / video.height : 16 / 9;
  return (
    <CompatibleVideoView
      accessibilityLabel={`Preview ${video.filename}`}
      allowsPictureInPicture={false}
      contentFit="contain"
      nativeControls
      player={player}
      style={[styles.preview, { aspectRatio: ratio }]}
    />
  );
}

export function VideoPostComposer({
  visible,
  onRequestClose,
}: {
  readonly visible: boolean;
  readonly onRequestClose: () => void;
}) {
  const client = useApiClient();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { theme } = useMobileUI();
  const { showToast } = useToast();
  const [body, setBody] = useState("");
  const [video, setVideo] = useState<SelectedPostVideo | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const upload = useDraftVideoUpload(video);
  const create = useMutation({
    mutationFn: async () => {
      if (!video) throw new Error("Choose a video first.");
      const asset = await upload.ensureUpload();
      return createVideoPost(client, {
        body: body.trim(),
        asset,
        visibility,
        idempotencyKey: Crypto.randomUUID(),
      });
    },
    onSuccess: async () => {
      if (video && userId) {
        try {
          await clearVideoUploadRecovery(userId, video);
        } catch {
          reportMobileDiagnostic({
            source: "persistence",
            code: "VIDEO_UPLOAD_RECOVERY_CLEANUP_FAILED",
            operation: "video-posts.publish-cleanup",
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: videoPostKeys.feed() });
      setBody("");
      setVideo(null);
      setVisibility("public");
      setSelectionError(null);
      showToast({ message: "Video post published.", tone: "success" });
      onRequestClose();
    },
  });

  const pickVideo = async () => {
    setSelectionError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSelectionError("Photo library access is required to choose a video. You can enable it in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 1,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });
    if (result.canceled) return;
    try {
      create.reset();
      setVideo(validateSelectedPostVideo(result.assets[0]!));
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "Video could not be selected.");
    }
  };

  const busy = create.isPending;
  const close = () => {
    if (busy) return;
    upload.cancel();
    create.reset();
    setBody("");
    setVideo(null);
    setVisibility("public");
    setSelectionError(null);
    onRequestClose();
  };
  const createError = create.error instanceof Error ? create.error.message : null;
  const uploadLabel =
    upload.phase === "uploading"
      ? `Uploading · ${upload.progress}%`
      : upload.phase === "processing"
        ? "Upload complete · Preparing playback"
        : upload.phase === "uploaded"
          ? "Ready to post"
          : upload.phase === "failed"
            ? "Upload failed"
            : "Preparing upload";

  return (
    <ModalSurface
      accessibilityLabel="Create video post"
      closeOnBackdrop={false}
      onRequestClose={close}
      variant="fullScreen"
      visible={visible}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <IconButton disabled={busy} icon="close" label="Close composer" onPress={close} />
        <AppText accessibilityRole="header" role="sectionTitle">New video post</AppText>
        <Button
          disabled={!video || upload.phase === "failed" || busy}
          label="Post"
          loading={busy}
          onPress={() => create.mutate()}
          size="compact"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          accessibilityHint="Optional text shown with your video"
          label="What’s happening?"
          maxLength={10_000}
          multiline
          onChangeText={setBody}
          placeholder="Share context, a thought, or leave it to the video."
          value={body}
        />
        <View accessibilityRole="radiogroup" style={styles.visibility}>
          <AppText color="textSecondary" role="metadata">Who can see this?</AppText>
          <View style={styles.chips}>
            {([
              ["public", "Everyone"],
              ["followers_only", "Followers"],
              ["private", "Only me"],
            ] as const).map(([value, label]) => (
              <Chip
                key={value}
                accessibilityRole="radio"
                disabled={busy}
                label={label}
                onPress={() => setVisibility(value)}
                selected={visibility === value}
              />
            ))}
          </View>
        </View>
        {video ? (
          <View style={[styles.attachment, { borderColor: theme.colors.border }]}>
            <LocalVideoPreview key={video.uri} video={video} />
            <View style={styles.attachmentInfo}>
              <View style={styles.filename}>
                <AppText numberOfLines={1} role="rowLabelCompact">{video.filename}</AppText>
                <AppText color="textSecondary" role="metadata">{uploadLabel}</AppText>
              </View>
              <IconButton
                disabled={busy}
                icon="trash"
                label="Remove video"
                onPress={() => {
                  upload.cancel();
                  create.reset();
                  setVideo(null);
                }}
              />
            </View>
            {upload.phase === "uploading" ? (
              <View
                accessibilityLabel="Video upload progress"
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: upload.progress }}
                style={[styles.progressTrack, { backgroundColor: theme.colors.fill }]}
              >
                <View style={[styles.progressValue, { backgroundColor: theme.colors.accent, width: `${upload.progress}%` }]} />
              </View>
            ) : null}
            {upload.error ? (
              <View style={styles.inlineError}>
                <AppText accessibilityLiveRegion="assertive" color="destructive" role="metadata">
                  {upload.error}
                </AppText>
                <Button label="Retry upload" onPress={upload.retry} size="compact" variant="secondary" />
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose video"
            onPress={() => void pickVideo()}
            style={({ pressed }) => [
              styles.picker,
              {
                backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surfaceSunken,
                borderColor: theme.colors.borderStrong,
              },
            ]}
          >
            <AppText role="sectionTitle">Choose video</AppText>
            <AppText align="center" color="textSecondary" role="metadata">
              MP4, MOV, WebM or MKV · up to 120 MB · 10 minutes
            </AppText>
          </Pressable>
        )}
        {selectionError || createError ? (
          <AppText accessibilityLiveRegion="assertive" color="destructive" role="metadata">
            {selectionError ?? createError}
          </AppText>
        ) : null}
      </ScrollView>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  attachment: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  attachmentInfo: { alignItems: "center", flexDirection: "row", gap: 8, padding: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  content: { gap: 20, padding: 16, paddingBottom: 48 },
  filename: { flex: 1, gap: 2 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 60,
    paddingHorizontal: 12,
  },
  inlineError: { alignItems: "flex-start", gap: 8, padding: 12, paddingTop: 0 },
  picker: {
    alignItems: "center",
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 220,
    padding: 24,
  },
  preview: { alignSelf: "center", backgroundColor: "#000000", maxHeight: 420, width: "100%" },
  progressTrack: { height: 4, marginHorizontal: 12, marginBottom: 12, overflow: "hidden" },
  progressValue: { height: 4 },
  visibility: { gap: 8 },
});
