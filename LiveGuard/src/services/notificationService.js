import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Call this in App.js on mount
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications() {
  // Expo Go dropped remote push notification support in SDK 53.
  // Return null gracefully so the rest of the app is unaffected.
  if (Constants.appOwnership === 'expo') {
    console.log('[Notifications] Skipping push registration in Expo Go (use a dev build for push).');
    return null;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenData.data; // ExponentPushToken[...] — sent to backend via POST /auth/register-device/
}

export function setupNotificationListeners(onReceived, onTapped) {
  // onReceived(notification) — app in foreground
  // onTapped(notification) — user tapped notification
  const receivedSub = Notifications.addNotificationReceivedListener(onReceived);
  const tappedSub = Notifications.addNotificationResponseReceivedListener(onTapped);

  // Return cleanup function (call in useEffect cleanup)
  return () => {
    receivedSub.remove();
    tappedSub.remove();
  };
}
