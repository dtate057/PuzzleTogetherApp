import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../../firebase';

export default function EditProfile() {
    const router = useRouter();
const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAvatarUrl(data.avatarUrl || '');
        setBio(data.bio || '');
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        avatarUrl,
        bio,
      });
      Alert.alert('Profile updated');
      router.replace(`/profile/${auth.currentUser.uid}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Update failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Avatar URL:</Text>
      <TextInput
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        style={styles.input}
        placeholder="https://example.com/avatar.jpg"
      />
      <Text style={styles.label}>Bio:</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={styles.input}
        placeholder="Say something about yourself..."
      />
      <Button title="Save Profile" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontWeight: 'bold', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
});
