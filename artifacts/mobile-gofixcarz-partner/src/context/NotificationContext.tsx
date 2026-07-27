/**
 * NotificationContext — FCM push notification integration via expo-notifications.
 *
 * expo-notifications is ONLY imported in standalone builds (EAS / APK / IPA).
 * In Expo Go (appOwnership === 'expo') we skip the import entirely because
 * expo-notifications throws a hard ERROR on Android Expo Go (SDK 53+) during
 * its own module initialisation — before any try/catch can stop it — which
 * stalls the JS module queue and prevents fonts from loading (blank icon boxes).
 *
 * In Expo Go the context mounts silently with unreadCount = 0.
 * In a standalone EAS build everything works as expected.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { QUERY_KEYS } from '@/src/constants/api';
import NotificationService from '@/src/services/notification.service';

/**
 * True when running inside Expo Go.
 * SDK 47+ uses executionEnvironment = 'storeClient'; older SDKs used appOwnership = 'expo'.
 * We check both so this works across SDK versions.
 */
const IS_EXPO_GO =
  (Constants.executionEnvironment as string) === 'storeClient' ||
  Constants.appOwnership === 'expo';

/* ── Route resolver ───────────────────────────────────────────────────────── */
type NotifData = Record<string, string | null | undefined>;

export function resolveRoute(data: NotifData): string {
  const type  = (data?.type  ?? '').toUpperCase();
  const refId = data?.reference_id ?? '';

  if (
    (type.includes('SERVICE') ||
     type.includes('INVOICE') ||
     type.includes('PAYMENT') ||
     type === 'JOB') &&
    refId
  ) {
    return `/(tabs)/jobs/${refId}`;
  }
  if (type.includes('BOOKING') && refId) {
    return `/(tabs)/bookings/${refId}`;
  }
  return '/(tabs)/more/notifications';
}

/* ── Context ──────────────────────────────────────────────────────────────── */
interface NotificationContextValue {
  unreadCount: number;
  refreshUnread: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount:   0,
  refreshUnread: () => {},
});

/* ── Provider ─────────────────────────────────────────────────────────────── */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const receivedSub = useRef<any>(null);
  const responseSub = useRef<any>(null);
  const handledId   = useRef<string | null>(null);

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
  function navigateFromNotif(data: NotifData, notifId: string, delayMs = 300) {
    if (handledId.current === notifId) return;
    handledId.current = notifId;
    const route = resolveRoute(data);
    setTimeout(() => {
      try { router.push(route as any); } catch { /* navigator not ready */ }
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS() });
      refreshUnread();
    }, delayMs);
  }

  /* ── setup ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    // In Expo Go, expo-notifications throws a hard ERROR on Android during its
    // own module initialisation (SDK 53+). We skip the import entirely so fonts
    // load cleanly and icons render correctly.
    if (IS_EXPO_GO || Platform.OS === 'web') {
      refreshUnread();
      return;
    }

    void (async () => {
      try {
        // Only reached in standalone EAS builds (APK / IPA)
        const Notifications = await import('expo-notifications');
        const Device        = await import('expo-device');

        // ── Foreground banner config ─────────────────────────────────────
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert:  true,
            shouldPlaySound:  true,
            shouldSetBadge:   true,
            shouldShowBanner: true,
            shouldShowList:   true,
          }),
        });

        // ── Android notification channel ─────────────────────────────────
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
        if (Device.isDevice) {
          const perms = (await Notifications.requestPermissionsAsync()) as any;
          const granted: boolean = perms.granted === true || perms.status === 'granted';

          if (granted) {
            try {
              const tokenData = await Notifications.getDevicePushTokenAsync();
              await NotificationService.registerToken(tokenData.data, Platform.OS);
            } catch {
              // Token registration failure is non-fatal
            }
          }
        }

        // ── Killed-state tap ─────────────────────────────────────────────
        try {
          const lastResponse = await Notifications.getLastNotificationResponseAsync();
          if (lastResponse) {
            const notifId = lastResponse.notification.request.identifier;
            const data    = (lastResponse.notification.request.content.data ?? {}) as NotifData;
            navigateFromNotif(data, notifId, 1000);
          }
        } catch { /* ignore */ }

        // ── Listeners ────────────────────────────────────────────────────
        receivedSub.current = Notifications.addNotificationReceivedListener(() => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS() });
          refreshUnread();
        });

        responseSub.current = Notifications.addNotificationResponseReceivedListener(response => {
          const notifId = response.notification.request.identifier;
          const data    = (response.notification.request.content.data ?? {}) as NotifData;
          navigateFromNotif(data, notifId, 400);
        });

      } catch {
        // expo-notifications unavailable (Expo Go) — degrade silently
      }
    })();

    refreshUnread();

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);

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
