import { Button, StyleSheet, Text, View } from 'react-native';
import { auth } from '../firebase';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to PuzzleTogether 💙</Text>
      <Button title="Logout" onPress={() => auth.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20 }
});
