import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, Slot } from 'expo-router';
import { useEffect } from 'react';
import { Alert, SafeAreaView } from 'react-native';
// 🔔 Configure foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true, // required for iOS
    shouldShowList: true    // required for iOS
  }),
});



export default function Layout() {
  useEffect(() => {
    registerForPushNotificationsAsync();

    // 🔔 Listen for notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
const screen = response.notification.request.content.data?.screen;

if (screen === 'home' || screen === 'feed') {
  console.log('Navigating to:', screen);
  router.push(`/${screen}` as const);
}
    });

    return () => subscription.remove();
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission required', 'Failed to get push token!');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
      // 🔥 Optional: Save token to Firestore here
    } else {
      Alert.alert('Physical device required', 'Push notifications need a real device.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Slot />
    </SafeAreaView>
  );
}
