"use client";

import {
  type ReactNode,
  useMemo,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NotificationRealtimeTransport } from "./types";
import { createAblyNotificationRealtimeTransport } from "./ablyTransport";
import { applyNotificationRealtimeEvent } from "./applyRealtimeEvent";
import { createNoopNotificationRealtimeTransport } from "./noopTransport";
import { emitNotificationSoundEvent } from "../utils/notificationSoundEvents";

interface NotificationRealtimeProviderProps {
  children: ReactNode;
  enabled: boolean;
  userId: string | null;
}

function buildTransport(enabled: boolean, userId: string | null): NotificationRealtimeTransport {
  if (!enabled || !userId) {
    return createNoopNotificationRealtimeTransport();
  }

  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY?.trim();
  if (!apiKey) {
    return createNoopNotificationRealtimeTransport();
  }

  return createAblyNotificationRealtimeTransport({
    userId,
    apiKey,
  });
}

export function NotificationRealtimeProvider({
  children,
  enabled,
  userId,
}: NotificationRealtimeProviderProps) {
  const queryClient = useQueryClient();
  const [fallbackTransport] = useState(createNoopNotificationRealtimeTransport);

  const transport = useMemo(function () {
    if (!enabled) {
      return fallbackTransport;
    }
    const nextTransport = buildTransport(enabled, userId);
    return nextTransport;
  }, [enabled, fallbackTransport, userId]);

  useEffect(
    function () {
      transport.connect();
      const unsubscribe = transport.subscribe(function (event) {
        if (event.type === "notification.new") {
          emitNotificationSoundEvent(event.notificationId);
        }
        applyNotificationRealtimeEvent(queryClient, event);
      });

      return function () {
        unsubscribe();
        transport.disconnect();
      };
    },
    [queryClient, transport]
  );

  return <>{children}</>;
}
