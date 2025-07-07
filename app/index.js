import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setReady(true);
      router.replace('/login');
    }, 100); // Small delay to allow layout to mount
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}
