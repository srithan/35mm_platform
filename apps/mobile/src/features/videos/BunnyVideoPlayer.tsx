import { AppIcon, AppText, Button, LoadingState, useMobileUI } from "@35mm/mobile-ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ComponentType, type RefAttributes } from "react";
import { AppState, Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { WebView, type WebViewProps } from "react-native-webview";

import { useApiClient } from "@/services/api";
import { fetchVideoPlayback } from "./api";
import { videoPostKeys } from "./queryKeys";

const MAX_PROCESSING_CHECKS = 40;
const CompatibleWebView = WebView as unknown as ComponentType<WebViewProps & RefAttributes<WebView>>;

export function BunnyVideoPlayer({
  assetId,
  title = "Video",
  initialAspectRatio,
  active = true,
  autoplay = false,
  startWithSound = false,
}: {
  readonly assetId: string;
  readonly title?: string;
  readonly initialAspectRatio?: number;
  readonly active?: boolean;
  readonly autoplay?: boolean;
  readonly startWithSound?: boolean;
}) {
  const client = useApiClient();
  const { theme } = useMobileUI();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [requested, setRequested] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const successfulChecks = useRef(0);
  const webView = useRef<WebView>(null);
  const autoplayAllowed = autoplay && !reduceMotion;
  const playbackActive = active && foreground;
  const query = useQuery({
    queryKey: videoPostKeys.playback(assetId),
    queryFn: ({ signal }) => fetchVideoPlayback(client, assetId, signal),
    enabled: playbackActive || requested,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: (current) => {
      const data = current.state.data;
      if (!playbackActive || !data || !("state" in data) || data.state !== "processing") return false;
      return successfulChecks.current < MAX_PROCESSING_CHECKS ? 15_000 : false;
    },
  });

  useEffect(() => {
    if (query.dataUpdatedAt > 0 && query.data && "state" in query.data && query.data.state === "processing") {
      successfulChecks.current += 1;
    }
  }, [query.data, query.dataUpdatedAt]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const command = playbackActive && autoplayAllowed ? "play" : "pause";
    webView.current?.injectJavaScript(`document.querySelector('video')?.${command}(); true;`);
  }, [autoplayAllowed, playbackActive]);

  const width = query.data?.width ?? null;
  const height = query.data?.height ?? null;
  const ratio = width && height ? width / height : initialAspectRatio ?? 16 / 9;
  const maxHeight = windowHeight * 0.7;
  const playerHeight = Math.min(maxHeight, Math.max(180, Math.min(windowWidth, 640) / ratio));
  const ready = query.data && "embedUrl" in query.data ? query.data : null;
  const playerSource = ready ? (() => {
    const url = new URL(ready.embedUrl);
    url.searchParams.set("autoplay", String(autoplayAllowed));
    url.searchParams.set("muted", String(!startWithSound));
    url.searchParams.set("preload", "true");
    url.searchParams.set("responsive", "false");
    url.searchParams.set("disableAirplay", "true");
    return url.toString();
  })() : null;
  const renderPlayer = Boolean(playerSource && (showPlayer || autoplayAllowed));

  return (
    <View
      accessibilityLabel={`${title} player`}
      style={[styles.frame, { height: playerHeight, backgroundColor: theme.colors.surfaceSunken }]}
      testID={`video-player-${assetId}`}
    >
      {!playbackActive && !requested && !query.data ? (
        <Pressable
          accessibilityLabel={`Load ${title}`}
          accessibilityRole="button"
          onPress={() => setRequested(true)}
          style={styles.center}
        >
          <View style={[styles.playButton, { backgroundColor: theme.colors.accent }]}>
            <AppIcon name="play" color={theme.colors.onAccent} size="large" filled />
          </View>
          <AppText color="textSecondary" role="metadata">Load video</AppText>
        </Pressable>
      ) : query.isPending || (query.isFetching && !query.data) ? (
        <LoadingState label="Authorizing video playback" compact />
      ) : query.error ? (
        <View accessibilityRole="alert" style={styles.center}>
          <AppText align="center">Video could not load.</AppText>
          <Button label="Retry" onPress={() => void query.refetch()} variant="secondary" />
        </View>
      ) : query.data && "state" in query.data ? (
        <View style={styles.center}>
          {query.data.state === "processing" ? <LoadingState label="Video processing" compact /> : null}
          <AppText
            accessibilityRole={query.data.state === "failed" ? "alert" : undefined}
            align="center"
            color="textSecondary"
          >
            {query.data.message}
          </AppText>
          {query.data.state === "processing" ? (
            <Button label="Check status" onPress={() => {
              successfulChecks.current = 0;
              void query.refetch();
            }} variant="secondary" />
          ) : null}
        </View>
      ) : ready && !renderPlayer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${title}`}
          onPress={() => setShowPlayer(true)}
          style={styles.posterButton}
        >
          <Image source={{ uri: ready.posterUrl }} resizeMode="contain" style={StyleSheet.absoluteFill} />
          <View style={[styles.playButton, { backgroundColor: theme.colors.accent }]}>
            <AppIcon name="play" color={theme.colors.onAccent} size="large" filled />
          </View>
        </Pressable>
      ) : ready && playerSource ? (
        <CompatibleWebView
          ref={webView}
          accessibilityLabel={`${title} controls`}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          javaScriptEnabled
          mediaPlaybackRequiresUserAction={!autoplayAllowed}
          onLoadStart={() => setShowPlayer(true)}
          originWhitelist={["https://iframe.mediadelivery.net"]}
          source={{ uri: playerSource, headers: { Referer: "https://35mm.in/" } }}
          style={styles.webView}
          testID={`video-webview-${assetId}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 20,
  },
  frame: {
    alignSelf: "center",
    borderRadius: 12,
    maxWidth: 640,
    overflow: "hidden",
    width: "100%",
  },
  playButton: {
    alignItems: "center",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  posterButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  webView: { backgroundColor: "#000000", flex: 1 },
});
