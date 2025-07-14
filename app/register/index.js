import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../../firebase'; // ✅ import db

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!email || !password) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔔 Get push token if on physical device
      let expoPushToken = null;

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
        }
      }

      // 💾 Save user to Firestore
await setDoc(doc(db, 'users', user.uid), {
  email: user.email,
  pushToken: expoPushToken || '',
  avatarUrl: `https://avatars.dicebear.com/api/initials/${encodeURIComponent(user.email)}.svg`,
  bio: '', // (optional for now — you can add a profile editing screen later)
});


console.log('User registered and token saved:', expoPushToken);

setTimeout(() => {
  console.log('Navigating to /home...');
        // ✅ Navigate to /home
  router.replace('/home');
}, 100);

    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register for PuzzleTogether</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Button title="Register" onPress={handleRegister} />
      <Text style={styles.link} onPress={() => router.push('/login')}>Already have an account? Login</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  link: { color: 'blue', textAlign: 'center', marginTop: 10 }
});
