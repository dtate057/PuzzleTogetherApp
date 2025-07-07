import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '../../firebase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

const handleRegister = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User registered:", userCredential.user.email);
    router.replace('/home');
  } catch (error) {
    console.error("Registration error:", error);
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
