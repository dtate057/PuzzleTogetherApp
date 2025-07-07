import { addDoc, collection, doc, increment, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { auth, db } from '../../firebase';

export default function FeedScreen() {
    const colorScheme = useColorScheme(); // 'light' or 'dark'
  const theme = colorScheme ?? 'light';

  const styles = StyleSheet.create({
   container: {
    flex: 1,
    padding: 16,
    backgroundColor: colorScheme === 'dark' ? '#121212' : '#fff',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f9f9f9',
    color: colorScheme === 'dark' ? '#fff' : '#000',
  },    
  post: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
    hotPost: {
    backgroundColor: colorScheme === 'dark' ? '#333000' : '#fffbe6',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9f00',
    paddingLeft: 8,
  },
  author: {
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#ffdd57' : '#333',
  },
  reaction: {
    marginRight: 12,
    fontSize: 18,
    color: colorScheme === 'dark' ? '#f2f2f2' : '#222',
  },
    filter: {
  paddingVertical: 4,
  paddingHorizontal: 10,
  marginRight: 8,
  marginBottom: 6,
  borderRadius: 5,
  backgroundColor: '#eee',
  color: '#000'
},
activeFilter: {
  backgroundColor: '#007AFF',
  color: '#fff'
}

});
    const [message, setMessage] = useState('');
  const [posts, setPosts] = useState([]);
const TAGS = ['#IEP', '#Meltdown', '#Win', '#Therapy', '#HardDay'];
const [selectedTag, setSelectedTag] = useState(TAGS[0]);
const [filterTag, setFilterTag] = useState(null);
const STORY_TEMPLATES = [
  { id: 1, title: 'Going to the Doctor', content: "We go to the doctor. We sit and wait. The doctor is nice and helps me." },
  { id: 2, title: 'Trying New Food', content: "Sometimes I try new food. It's okay to take small bites. I can say 'no thank you'." },
  { id: 3, title: 'Using My Words', content: "When I'm upset, I can use my words. I can say 'I need a break' or 'I feel mad'." }
];

  // Submit new post
  const handlePost = async () => {
    if (!message.trim()) return;

await addDoc(collection(db, 'posts'), {
  text: message,
  author: auth.currentUser.email,
  tag: selectedTag,
  createdAt: new Date(),
  reactions: { '💗': 0, '🌼': 0, '🔄': 0 }
});
    setMessage('');
  };

  // Realtime feed listener
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(items);
    });

    return unsubscribe;
  }, []);
const handleReact = async (postId, emoji) => {
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    [`reactions.${emoji}`]: increment(1)
  });
};

  return (
  <View style={styles.container}>
    {/* Input + Tag Picker */}
     {/* TAG PICKER FOR NEW POST */}

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
      {TAGS.map(tag => (
        <Text
          key={tag}
          style={{
            marginRight: 8,
            padding: 6,
            backgroundColor: selectedTag === tag ? '#007AFF' : '#eee',
            color: selectedTag === tag ? '#fff' : '#000',
            borderRadius: 4
          }}
          onPress={() => setSelectedTag(tag)}
        >
          {tag}
        </Text>
      ))}
    </View> 
      {/* TEXT INPUT + POST */}
<View style={{ marginBottom: 10 }}>
  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>📘 StoryShare Templates:</Text>
  {STORY_TEMPLATES.map((story) => (
    <Text
      key={story.id}
      style={{
        padding: 6,
        marginBottom: 4,
        backgroundColor: '#e0f7fa',
        borderRadius: 5
      }}
      onPress={() => setMessage(story.content)}
    >
      {story.title}
    </Text>
  ))}
</View>

    <TextInput
      value={message}
      onChangeText={setMessage}
      placeholder="Share something with the community..."
      style={styles.input}
    />
    <Button title="Post" onPress={handlePost} />
  {/* FILTER CONTROLS */}
<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
  <Text
    style={[styles.filter, !filterTag && styles.activeFilter]}
    onPress={() => setFilterTag(null)}
  >
    All
  </Text>
  {TAGS.map(tag => (
    <Text
      key={tag}
      style={[styles.filter, filterTag === tag && styles.activeFilter]}
      onPress={() => setFilterTag(tag)}
    >
      {tag}
    </Text>
  ))}
</View>


    {/* Post Feed */}
      {/* FEED LIST */}

<FlatList
  data={filterTag ? posts.filter(p => p.tag === filterTag) : posts}
  keyExtractor={(item) => item.id}
renderItem={({ item }) => {
  const totalReactions = Object.values(item.reactions || {}).reduce((sum, count) => sum + count, 0);

  return (
    <View style={[styles.post, totalReactions >= 5 && styles.hotPost]}>
      <Text style={styles.author}>{item.author}</Text>
      <Text>{item.tag} — {item.text}</Text>

      {totalReactions >= 5 && <Text>🔥 Top Post</Text>}

      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {['💗', '🌼', '🔄'].map((emoji) => (
          <Text
            key={emoji}
            style={styles.reaction}
            onPress={() => handleReact(item.id, emoji)}
          >
            {emoji} {item.reactions?.[emoji] || 0}
          </Text>
        ))}
      </View>
    </View>
  );
}}

/>


  </View>
);
}

