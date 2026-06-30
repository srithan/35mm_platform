"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import useSound from "use-sound";
import { fetchNotifications } from "@/features/notifications/api/notificationsApi";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import { NOTIFICATION_SOUND_EVENT } from "@/features/notifications/utils/notificationSoundEvents";

const NOTIFICATION_SOUND_SRC = "/235911__yfjesse__notification-sound.wav";
const SOUND_VOLUME = 0.45;
const REALTIME_SOUND_DEDUPE_MS = 60_000;

export function NotificationSoundPlayer() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const seenNotificationKeysRef = useRef<Set<string>>(new Set());
  const realtimePlayedNotificationIdsRef = useRef<Map<string, number>>(new Map());
  const initializedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const [playSound] = useSound(NOTIFICATION_SOUND_SRC, {
    volume: SOUND_VOLUME,
    interrupt: true,
  });

  const unreadQuery = useQuery({
    queryKey: notificationsKeys.unread(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        unreadOnly: true,
        limit: 50,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });

  const playNotificationSound = useCallback(function () {
    playSound();
  }, [playSound]);

  const rememberRealtimeSound = useCallback(function (notificationId: string) {
    const playedIds = realtimePlayedNotificationIdsRef.current;
    const now = Date.now();

    for (const [id, playedAt] of playedIds) {
      if (now - playedAt > REALTIME_SOUND_DEDUPE_MS) {
        playedIds.delete(id);
      }
    }

    playedIds.set(notificationId, now);
  }, []);

  useEffect(
    function () {
      function onNotificationSound(event: Event) {
        const detail = (event as CustomEvent<{ notificationId?: unknown }>).detail;
        const notificationId = typeof detail?.notificationId === "string" ? detail.notificationId.trim() : "";
        if (!notificationId) return;

        playNotificationSound();
        rememberRealtimeSound(notificationId);
      }

      window.addEventListener(NOTIFICATION_SOUND_EVENT, onNotificationSound);
      return function () {
        window.removeEventListener(NOTIFICATION_SOUND_EVENT, onNotificationSound);
      };
    },
    [playNotificationSound, rememberRealtimeSound]
  );

  useEffect(
    function () {
      const currentUserId = user?.id ?? null;
      if (!isLoaded || !isSignedIn || !currentUserId) {
        userIdRef.current = null;
        initializedRef.current = false;
        seenNotificationKeysRef.current = new Set();
        realtimePlayedNotificationIdsRef.current = new Map();
        return;
      }

      if (userIdRef.current !== currentUserId) {
        userIdRef.current = currentUserId;
        initializedRef.current = false;
        seenNotificationKeysRef.current = new Set();
        realtimePlayedNotificationIdsRef.current = new Map();
      }

      const items = unreadQuery.data?.items;
      if (!items) return;

      const notificationKeys = items.map(function (item) {
        return `${item.id}:${item.createdAt}`;
      });

      if (!initializedRef.current) {
        seenNotificationKeysRef.current = new Set(notificationKeys);
        initializedRef.current = true;
        return;
      }

      const seenKeys = seenNotificationKeysRef.current;
      const realtimePlayedIds = realtimePlayedNotificationIdsRef.current;
      const now = Date.now();
      let newNotificationCount = 0;
      for (let index = 0; index < notificationKeys.length; index += 1) {
        const key = notificationKeys[index];
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const notificationId = items[index]?.id;
        const realtimePlayedAt = notificationId ? realtimePlayedIds.get(notificationId) : undefined;
        if (realtimePlayedAt && now - realtimePlayedAt <= REALTIME_SOUND_DEDUPE_MS) {
          continue;
        }
        newNotificationCount += 1;
      }

      for (let index = 0; index < newNotificationCount; index += 1) {
        playNotificationSound();
      }
    },
    [isLoaded, isSignedIn, playNotificationSound, unreadQuery.data?.items, user?.id]
  );

  return null;
}
