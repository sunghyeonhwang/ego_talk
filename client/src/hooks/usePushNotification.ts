import { useState, useEffect, useCallback } from 'react';
import { subscribePush, unsubscribePush } from '../api/index';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface UsePushNotificationReturn {
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  isSupported: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotification(): UsePushNotificationReturn {
  const isSupported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY);

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? (Notification.permission as NotificationPermission) : 'denied'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported) return;

    let cancelled = false;

    async function checkSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setIsSubscribed(existing !== null);
        }
      } catch {
        // Service worker may not be registered yet
      }
    }

    checkSubscription();
    return () => { cancelled = true; };
  }, [isSupported]);

  // Register service worker on mount (idempotent)
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return;

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermission);

      if (perm !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await subscribePush(subscription.toJSON() as PushSubscriptionJSON);
      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe };
}
