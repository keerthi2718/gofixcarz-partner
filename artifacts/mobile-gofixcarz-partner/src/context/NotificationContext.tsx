/**
 * NotificationContext — FCM push notification integration via expo-notifications.
 *
 * Responsibilities:
 *  - Request permission & register device push token with the backend
 *  - Configure Android notification channel
 *  - Show foreground banners
 *  - Auto-refresh the notifications query cache when a push arrives
 *  - Navigate to the correct screen when the user taps a notification
 *  - Expose `unreadCount` for the home-screen bell badge
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import NotificationService from '@/src/services/notification.service';

/* ── Foreground banner config ─────────────────────────────────────────────── */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

/* ── Route resolver ───────────────────────────────────────────────────────── */
type NotifData = Record<string, string | null | undefined>;

export function resolveRoute(data: NotifData): string {
  const type  = (data?.type  ?? '').toUpperCase();
  const refId = data?.reference_id ?? '';

  // Job-lifecycle events
  if (
    (type.includes('SERVICE') ||
     type.includes('INVOICE') ||
     type.includes('PAYMENT') ||
     type === 'JOB') &&
    refId
  ) {
    return `/(tabs)/jobs/${refId}`;
  }

  // Booking events
  if (type.includes('BOOKING') && refId) {
    return `/(tabs)/bookings/${refId}`;
  }

  // Fallback → notifications list
  return '/(tabs)/more/notifications';
}

/* ── Context ──────────────────────────────────────────────────────────────── */
interface NotificationContextValue {
  unreadCount: number;
  refreshUnread: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount:    0,
  refreshUnread:  () => {},
});

/* ── Provider ─────────────────────────────────────────────────────────────── */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const receivedSub  = useRef<Notifications.EventSubscription | null>(null);
  const responseSub  = useRef<Notifications.EventSubscription | null>(null);
  // Prevent double-navigation when both getLastNotificationResponseAsync
  // and addNotificationResponseReceivedListener fire for the same tap.
  const handledId    = useRef<string | null>(null);

  /* ── fetch unread count ─────────────────────────────────────────────────── */
  const refreshUnread = React.useCallback(async () => {
    try {
      const result = await NotificationService.list({ unread_only: true, page_size: 1 });
      setUnreadCount(result?.total ?? 0);
    } catch {
      // silent — badge count is non-critical
    }
  }, []);

  /* ── navigate to notification target ───────────────────────────────────── */
  function navigateFromNotif(
    data: NotifData,
    notifId: string,
    delayMs = 300,
  ) {
    if (handledId.current === notifId) return;
    handledId.current = notifId;
    const route = resolveRoute(data);
    setTimeout(() => {
      try { router.push(route as any); } catch { /* ignore if navigator not ready */ }
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS() });
      refreshUnread();
    }, delayMs);
  }

  /* ── setup ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    // Web doesn't support push notifications
    if (Platform.OS === 'web') return;

    void (async () => {
      // ── Android notification channel ───────────────────────────────────
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name:             'GoFixCarz Alerts',
          importance:       Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor:       '#C41E3A',
          showBadge:        true,
        });
      }

      // ── Permission + token registration ──────────────────────────────
      if (!Device.isDevice) {
        // Simulators/emulators can't receive push — skip silently
      } else {
        // requestPermissionsAsync returns current status if already decided.
        // Cast to `any` — the expo PermissionResponse type is not fully
        // re-exported by the `expo` package's TypeScript declarations, but
        // `.granted` and `.status` are present at runtime.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perms = (await Notifications.requestPermissionsAsync()) as any;
        const permissionGranted: boolean =
          perms.granted === true || perms.status === 'granted';

        if (permissionGranted) {
          try {
            // getDevicePushTokenAsync returns the raw FCM (Android) / APNs (iOS)
            // token — no EAS project ID required.
            const tokenData = await Notifications.getDevicePushTokenAsync();
            await NotificationService.registerToken(tokenData.data, Platform.OS);
          } catch {
            // Token registration failure is non-fatal; the app continues normally.
          }
        }
      }

      // ── Killed-state tap (app launched by notification) ───────────────
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          const notifId = lastResponse.notification.request.identifier;
          const data    = (lastResponse.notification.request.content.data ?? {}) as NotifData;
          navigateFromNotif(data, notifId, 1000); // longer delay — navigator still mounting
        }
      } catch { /* ignore */ }
    })();

    // ── Foreground notification received ────────────────────────────────
    receivedSub.current = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS() });
      refreshUnread();
    });

    // ── Notification tapped (foreground / background) ───────────────────
    responseSub.current = Notifications.addNotificationResponseReceivedListener(response => {
      const notifId = response.notification.request.identifier;
      const data    = (response.notification.request.content.data ?? {}) as NotifData;
      navigateFromNotif(data, notifId, 400);
    });

    // Initial unread count fetch
    refreshUnread();

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []); // run once on mount

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */
export function useNotificationContext(): NotificationContextValue {
  return useContext(NotificationContext);
}
