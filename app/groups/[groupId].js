import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../../firebase';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [isMember, setIsMember] = useState(false);
const [message, setMessage] = useState('');
const [selectedTag, setSelectedTag] = useState(null);
const [groupPostText, setGroupPostText] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      const docRef = doc(db, 'groups', groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroup(data);
        setIsMember(data.members?.includes(auth.currentUser.uid));
      }
    };
    fetchGroup();
  }, []);

  const handleJoin = async () => {
    if (!group) return;

    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayUnion(auth.currentUser.uid),
    });

    setIsMember(true);
    Alert.alert('Joined!', 'You have joined this group.');
  };
const handlePostToGroup = async () => {
  if (!message.trim()) return;

  await addDoc(collection(db, 'posts'), {
    text: message,
    author: auth.currentUser.email,
    authorId: auth.currentUser.uid,
    groupId: route.params.groupId, // 👈 Assign group ID from the screen
    createdAt: new Date(),
    tag: selectedTag || null,
    reactions: { '💗': 0, '🌼': 0, '🔄': 0 },
    comments: [],
  });

  setMessage('');
};

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>Loading group details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{group.name}</Text>
      <Text style={styles.description}>{group.description}</Text>
      <Text style={styles.tags}>Tags: {group.tags?.join(', ')}</Text>

      {isMember ? (
        <Text style={styles.memberText}>✅ You are a member of this group</Text>
      ) : (
        <Button title="Join Group" onPress={handleJoin} />
      )}
      {isMember && (
  <View style={{ marginTop: 20 }}>
    <Text style={{ fontWeight: 'bold' }}>Create a Post</Text>
    <TextInput
      placeholder="Write something..."
      value={groupPostText}
      onChangeText={setGroupPostText}
      style={{
        borderColor: '#ccc',
        borderWidth: 1,
        padding: 10,
        marginVertical: 10,
        borderRadius: 6,
      }}
    />
<Button title="Post to Group" onPress={handlePostToGroup} />
  </View>
)}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  description: { fontSize: 16, marginBottom: 8 },
  tags: { fontSize: 14, color: '#888' },
  memberText: { marginTop: 10, color: 'green' },
});
