import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';
import { auth } from '../../firebase';

export default function HomeScreen() {
  const handleLogout = () => {
    auth.signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {auth.currentUser?.email}</Text>

      <Button title="Go to Feed" onPress={() => router.push('/feed')} />
      <View style={{ height: 16 }} />
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, marginBottom: 20, textAlign: 'center' }
});
