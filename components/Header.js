// components/Header.js
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebase';

export default function Header({ title = "PuzzleTogether", showProfile = true }) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {showProfile && (
        <TouchableOpacity
          onPress={() => router.push(`/profile/${auth.currentUser.uid}`)}
        >
          <Image
            source={{ uri: auth.currentUser?.photoURL || 'https://www.gravatar.com/avatar/?d=mp' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
