import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../firebase';

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const router = useRouter();

  const handleCreateGroup = async (name, description, tags) => {
  try {
    await addDoc(collection(db, 'groups'), {
      name,
      description,
      tags,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid,
      members: [auth.currentUser.uid], // auto-join creator
    });
    alert('Group created successfully!');
  } catch (error) {
    console.error('Error creating group:', error);
    alert('Something went wrong. Please try again.');
  }
};

  const handleSubmit = async () => {
    if (!name || !description) {
      alert('Please fill in all required fields');
      return;
    }

    const tagList = tags.split(',').map((tag) => tag.trim());
    await handleCreateGroup(name, description, tagList); // you'll import this function next
    router.back(); // go back to the previous screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Group Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Autism Support - Ages 5-7"
      />
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description about the group"
        multiline
      />
      <Text style={styles.label}>Tags (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={tags}
        onChangeText={setTags}
        placeholder="e.g., speech, social, play"
      />
      <Button title="Create Group" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    borderColor: '#ccc',
    borderRadius: 6,
  },
  label: {
    marginBottom: 4,
    fontWeight: 'bold',
  },
});
