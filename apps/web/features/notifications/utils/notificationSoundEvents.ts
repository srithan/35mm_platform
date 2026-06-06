export const NOTIFICATION_SOUND_EVENT = "35mm:notification-sound";

export function emitNotificationSoundEvent(notificationId: string): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_SOUND_EVENT, {
      detail: {
        notificationId,
      },
    })
  );
}
