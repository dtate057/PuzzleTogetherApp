export async function sendPushNotification(expoPushToken, message) {
  if (!expoPushToken) return;

  const notification = {
    to: expoPushToken,
    sound: 'default',
    title: '🧩 New Post in PuzzleTogether!',
    body: message,
    data: { screen: 'Feed' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(notification),
  });
}
