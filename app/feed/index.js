import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as ImagePicker from 'expo-image-picker';
import { router, useNavigation } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../../components/Header';
import { auth, db, storage } from '../../firebase'; // ensure both are imported
import { sendPushNotification } from '../utils/sendPushNotification'; // adjust path as needed

dayjs.extend(relativeTime);

export default function FeedScreen() {
  const colorScheme = useColorScheme(); // 'light' or 'dark'
  const theme = colorScheme ?? 'light';
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      backgroundColor: colorScheme === 'dark' ? '#121212' : '#fff',
    },
    input: {
      borderWidth: 1,
 paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 12,
  marginVertical: 6,
      borderRadius: 5,
      backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f9f9f9',
      color: colorScheme === 'dark' ? '#fff' : '#000',
    },
    post: {
 paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 12,
  marginVertical: 6,
      borderColor: '#ccc',
    },
    hotPost: {
      backgroundColor: colorScheme === 'dark' ? '#333000' : '#fffbe6',
      borderLeftWidth: 4,
      borderLeftColor: '#ff9f00',
      paddingLeft: 8,
    },
    author: {
       paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 12,
  marginVertical: 6,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#ffdd57' : '#333',
    },
    reaction: {
 paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 12,
  marginVertical: 6,
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
    },
    commentSection: {
      marginTop: 10,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
 paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 12,
  marginVertical: 6,
    },
commentContainer: {
  backgroundColor: '#f1f1f1',
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 12,
  marginVertical: 6,
  borderWidth: 1,
  borderColor: '#ddd',
  flex: 1,
},



    commentAuthor: {
      fontWeight: 'bold',
    },
 createButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

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
  const [commentText, setCommentText] = useState({});
  const [editingComment, setEditingComment] = useState(null); // { postId, index }
  const [editedText, setEditedText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [editingPost, setEditingPost] = useState(null); // entire post object
  const [editedPostText, setEditedPostText] = useState('');
  const [showFollowingFeed, setShowFollowingFeed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [image, setImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { postId, commentIndex }
  const [replyText, setReplyText] = useState('');
  const [showSavedFeed, setShowSavedFeed] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState([]);
const navigation = useNavigation();


  // Submit new post 
  const handlePost = async () => {
    if (!message.trim() && !image) {
      Alert.alert('Post is empty', 'Please enter a message or select an image.');
      return;
    }

    let imageUrl = null;

    // 🖼️ Upload selected image if it exists
    if (image) {
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const filename = `${auth.currentUser.uid}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `post_images/${filename}`);
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error('Image upload failed:', err);
        Alert.alert('Error', 'Failed to upload image.');
        return;
      }
    }

    // 📝 Create the post
    await addDoc(collection(db, 'posts'), {
      text: message,
      author: auth.currentUser.email,
      authorId: auth.currentUser.uid,
      tag: selectedTag,
      createdAt: new Date(),
      imageUrl, // ✅ include uploaded image URL
      reactions: { '💗': 0, '🌼': 0, '🔄': 0 },
      comments: []
    });

    // 🔔 Send push notifications to other users
    const usersSnapshot = await getDocs(collection(db, 'users'));

    usersSnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      const token = userData.pushToken;

      if (token && userData.email !== auth.currentUser.email) {
        sendPushNotification(token, `${auth.currentUser.email} just posted in PuzzleTogether!`);
      }
    });

    // 🔄 Reset form
    setMessage('');
    setImage(null); // ✅ Clear image preview
  };

  const startEditingPost = (post) => {
    setEditingPost(post);
    setEditedPostText(post.text);
  };

  const confirmDeletePost = (postId) => {
    Alert.alert(
      'Delete Post?',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePost(postId),
        },
      ]
    );
  };

  const handleDeletePost = async (postId) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { deleted: true }); // or use deleteDoc if you want to permanently remove
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Delete failed:", err);
      Alert.alert("Error", "Couldn't delete post");
    }
  };

  const fetchFollowingPosts = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return [];

    const currentUserSnap = await getDoc(doc(db, 'users', currentUserId));
    const following = currentUserSnap.data()?.following || [];

    if (following.length === 0) return [];

    const limitedUids = following.slice(0, 10); // Firestore limit
    const q = query(collection(db, 'posts'), where('authorId', 'in', limitedUids));
    const postSnap = await getDocs(q);
    return postSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };



  // Realtime feed listener
  useEffect(() => {
    const fetchSavedPostIds = async () => {
      if (auth.currentUser?.uid) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        const saved = userSnap.data()?.savedPosts || [];
        setSavedPostIds(saved);
      }
    };

    const fetchCommentProfiles = async (items) => {
      const commentAuthorIds = new Set();
      items.forEach((post) => {
        (post.comments || []).forEach((comment) => {
          if (comment.authorId) commentAuthorIds.add(comment.authorId);
        });
      });

      for (const uid of commentAuthorIds) {
        await fetchUserProfile(uid);
      }
    };

    const loadSaved = async () => {
      setLoading(true);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const savedIds = userSnap.data()?.savedPosts || [];
      setSavedPostIds(savedIds);

      if (savedIds.length === 0) {
        setPosts([]);
        setEmptyMessage('You haven’t saved any posts yet.');
        setLoading(false);
        return;
      }

      const savedPosts = [];
      for (const id of savedIds) {
        const postDoc = await getDoc(doc(db, 'posts', id));
        if (postDoc.exists()) {
          savedPosts.push({ id, ...postDoc.data() });
        }
      }

      setPosts(savedPosts);
      setEmptyMessage('');
      await fetchCommentProfiles(savedPosts);
      setLoading(false);
    };

    const loadFollowing = async () => {
      setLoading(true);
      const items = await fetchFollowingPosts();
      setPosts(items);

      if (items.length === 0) {
        setEmptyMessage('Follow other users to see their posts here.');
      } else {
        setEmptyMessage('');
      }

      await fetchCommentProfiles(items);
      setLoading(false);
    };

    if (showSavedFeed) {
      loadSaved();
      return;
    }

    if (showFollowingFeed) {
      loadFollowing();
      return;
    }

    // 🔁 Realtime listener for "All Posts"
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    setLoading(true);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPosts(items);
      setEmptyMessage(items.length === 0 ? 'No posts yet. Be the first to post!' : '');
      await fetchSavedPostIds();
      await fetchCommentProfiles(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [showSavedFeed, showFollowingFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      if (showFollowingFeed) {
        const items = await fetchFollowingPosts();
        setPosts(items);
      } else {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(items);
      }
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    }

    setRefreshing(false);
  };

  const handleReact = async (postId, emoji) => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      [`reactions.${emoji}`]: increment(1)
    });
  };
  const toggleSavePost = async (postId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentSaves = userSnap.data()?.savedPosts || [];

      let updatedSaves;
      if (currentSaves.includes(postId)) {
        // 🧹 Unsave
        updatedSaves = currentSaves.filter(id => id !== postId);
      } else {
        // 💾 Save
        updatedSaves = [...currentSaves, postId];
      }

      await updateDoc(userRef, {
        savedPosts: updatedSaves,
      });

      setSavedPostIds(updatedSaves); // ✅ Update local state too
    } catch (err) {
      console.error('Failed to toggle save:', err);
      Alert.alert('Error', 'Could not update saved posts.');
    }
  };


  const handleAddComment = async (postId) => {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userAvatar = userDoc.exists() && userDoc.data().avatar?.startsWith('http')
      ? userDoc.data().avatar
      : ''; const text = commentText[postId]?.trim();
    if (!text) return;

    setCommentLoading(true); // 🟡 Start loading

    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) return;

      const post = postSnap.data();

      await updateDoc(postRef, {
        comments: arrayUnion({
          author: auth.currentUser.email,
          avatar: userAvatar,
          text,
          createdAt: new Date(),
          reactions: { '💗': 0, '🙏': 0, '🤗': 0 },
          replies: [] // ✅ support nested replies
        }),

      });

      setCommentText((prev) => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Couldn't post your comment.");
    }

    setCommentLoading(false); // ✅ Done loading
  };
  const handleSendReply = async (postId, commentIndex) => {
    if (!replyText.trim()) return;

    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      const post = postSnap.data();
      const comments = [...(post.comments || [])];

      const reply = {
        author: auth.currentUser.email,
        text: replyText.trim(),
        createdAt: new Date(),
        reactions: { '💗': 0, '🙏': 0, '🤗': 0 },
      };

      if (!comments[commentIndex].replies) {
        comments[commentIndex].replies = [];
      }

      comments[commentIndex].replies.push(reply);

      await updateDoc(postRef, { comments });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments } : p
        )
      );

      setReplyText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to send reply:', err);
      Alert.alert('Error', 'Could not send reply');
    }
  };


  const handleDeleteComment = async (postId, commentToDelete) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      const post = postSnap.data();

      const updatedComments = (post.comments || []).filter(
        (c) =>
          !(
            c.author === commentToDelete.author &&
            c.text === commentToDelete.text &&
            c.createdAt?.seconds === commentToDelete.createdAt?.seconds
          )
      );

      await updateDoc(postRef, {
        comments: updatedComments,
      });

      // 🔁 Update local UI
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, comments: updatedComments } : post
        )
      );
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Failed to delete comment');
    }
  };
  const handleSaveEdit = async (postId, index) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      const post = postSnap.data();

      const updatedComments = [...(post.comments || [])];
      updatedComments[index] = {
        ...updatedComments[index],
        text: editedText,
        edited: true,
      };

      await updateDoc(postRef, {
        comments: updatedComments,
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: updatedComments } : p
        )
      );

      setEditingComment(null);
      setEditedText('');
    } catch (error) {
      console.error('Failed to save edited comment:', error);
      Alert.alert('Failed to edit comment');
    }
  };
  const handleCommentReaction = async (postId, commentIndex, emoji) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      const post = postSnap.data();
      const comments = [...(post.comments || [])];

      const currentReactions = comments[commentIndex].reactions || {};
      comments[commentIndex].reactions = {
        ...currentReactions,
        [emoji]: (currentReactions[emoji] || 0) + 1,
      };

      await updateDoc(postRef, { comments });

      // ✅ Update local state
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, comments } : post
        )
      );
    } catch (error) {
      console.error('Failed to react to comment:', error);
      Alert.alert('Could not react to comment');
    }
  };
  const fetchUserProfile = async (uid) => {
    if (userProfiles[uid]) return; // Already fetched

    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();

        // 🧩 Ensure savedPosts field exists
        if (!userData.savedPosts) {
          await updateDoc(docRef, { savedPosts: [] });
          userData.savedPosts = []; // So it's reflected locally too
        }

        setUserProfiles(prev => ({ ...prev, [uid]: userData }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleSaveEditedPost = async () => {
    if (!editingPost) return;
    try {
      const postRef = doc(db, 'posts', editingPost.id);
      await updateDoc(postRef, { text: editedPostText });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id ? { ...p, text: editedPostText } : p
        )
      );

      setEditingPost(null);
      setEditedPostText('');
    } catch (error) {
      console.error("Failed to update post:", error);
      Alert.alert("Error", "Could not update post");
    }
  };


  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
         <Header />

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
            <Button title="All Posts" onPress={() => { setShowFollowingFeed(false); setShowSavedFeed(false); }} />
            <Button title="Following" onPress={() => { setShowFollowingFeed(true); setShowSavedFeed(false); }} />
            <Button title="Saved" onPress={() => { setShowSavedFeed(true); setShowFollowingFeed(false); }} />
         <TouchableOpacity
  style={styles.createButton}
  onPress={() => navigation.navigate('create-group')}
>
  <Text style={styles.createButtonText}>+ Create Group</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => router.push('/groups')}>
  <Text>Go to Groups</Text>
</TouchableOpacity>

          </View>


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
        <Button title="📷 Pick Image (optional)" onPress={pickImage} />

        {image && (
          <View style={{ marginTop: 10, alignItems: 'center' }}>
            <Image
              source={{ uri: image }}
              style={{ width: '100%', height: 200, borderRadius: 8 }}
              resizeMode="cover"
            />
            <Text style={{ color: 'red', marginTop: 4 }} onPress={() => setImage(null)}>
              ❌ Remove Image
            </Text>
          </View>
        )}

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
        {loading ? (
          <Text style={{ textAlign: 'center', marginVertical: 20 }}>Loading posts...</Text>
        ) : emptyMessage ? (
          <Text style={{ textAlign: 'center', marginVertical: 20, color: '#888' }}>{emptyMessage}</Text>
        ) : null}

        <FlatList
          data={
            filterTag
              ? posts.filter((p) => p.tag === filterTag)
              : showSavedFeed
                ? posts.filter((item) => savedPostIds.includes(item.id))
                : posts
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const totalReactions = Object.values(item.reactions || {}).reduce((sum, count) => sum + count, 0);

            return (
              <View style={[styles.post, totalReactions >= 5 && styles.hotPost]}>
                {/* 🔗 Author Link */}
                <Text
                  style={{ color: 'blue' }}
                  onPress={() => router.push(`/profile/${item.authorId}`)}
                >
                  {item.author}
                </Text>
                {auth.currentUser?.uid && (
                  <Text
                    style={{
                      color: savedPostIds.includes(item.id) ? 'green' : 'gray',
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                    onPress={() => toggleSavePost(item.id)}
                  >
                    {savedPostIds.includes(item.id) ? '🔖 Saved (tap to unsave)' : '🔖 Save this post'}
                  </Text>
                )}


                {editingPost?.id === item.id ? (
                  <>
                    <TextInput
                      value={editedPostText}
                      onChangeText={setEditedPostText}
                      style={{
                        borderWidth: 1,
                        borderColor: '#ccc',
                        padding: 6,
                        borderRadius: 6,
                        marginBottom: 4,
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button title="💾 Save" onPress={handleSaveEditedPost} />
                      <Button title="Cancel" onPress={() => setEditingPost(null)} />
                    </View>
                  </>
                ) : (
                  <Text>{item.tag} — {item.text}</Text>

                )}
                {item.imageUrl?.startsWith('http') && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{
                      width: '100%',
                      height: 250,
                      borderRadius: 10,
                      marginTop: 8,
                      backgroundColor: '#eee', // subtle placeholder while loading
                    }}
                    resizeMode="contain"
                    onError={(e) => console.log('Image failed to load:', e.nativeEvent.error)}
                  />
                )}




                {item.authorId === auth.currentUser.uid && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    <Text
                      style={{ color: 'blue', fontSize: 12 }}
                      onPress={() => startEditingPost(item)}
                    >
                      ✏️ Edit
                    </Text>
                    <Text
                      style={{ color: 'red', fontSize: 12 }}
                      onPress={() => confirmDeletePost(item.id)}
                    >
                      🗑️ Delete
                    </Text>

                  </View>
                )}

                {/* 🔥 Badge */}
                {totalReactions >= 5 && <Text>🔥 Top Post</Text>}

                {/* 🧠 Reaction Buttons */}
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

                {/* 💬 Comments Display */}
                {Array.isArray(item.comments) && item.comments.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>Comments:</Text>
                    {item.comments?.map((comment, index) => {
                      const profile = userProfiles[comment.authorId];

                      return (
                        <View
                          key={index}
                          style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}
                        >
                          <Image
                            source={{
                              uri: profile?.avatarUrl || 'https://www.gravatar.com/avatar/?d=mp',
                            }}
                            style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }}
                          />

                          <View style={styles.commentContainer}>
                            <Text style={styles.commentAuthor}>
                              {profile?.email || comment.author}
                            </Text>
                            {editingComment?.postId === item.id && editingComment?.index === index ? (
                              <>
                                <TextInput
                                  value={editedText}
                                  onChangeText={setEditedText}
                                  style={{
                                    borderColor: '#ccc',
                                    borderWidth: 1,
                                    padding: 6,
                                    borderRadius: 6,
                                    marginBottom: 6,
                                  }}
                                />
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  <Button title="💾 Save" onPress={() => handleSaveEdit(item.id, index)} />
                                  <Button title="Cancel" onPress={() => setEditingComment(null)} />
                                </View>
                              </>
                            ) : (
                              <>
                                <Text>{comment.text}</Text>
                                <Text style={{ fontSize: 10, color: '#888' }}>
                                  {comment.createdAt?.toDate
                                    ? dayjs(comment.createdAt.toDate()).fromNow()
                                    : ''}
                                </Text>

                                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                  {['💗', '🙏', '🤗'].map((emoji) => (
                                    <Text
                                      key={emoji}
                                      style={{ marginRight: 8 }}
                                      onPress={() => handleCommentReaction(item.id, index, emoji)}
                                    >
                                      {emoji} {comment.reactions?.[emoji] || 0}
                                    </Text>
                                  ))}


                                </View>

                                {comment.edited && (
                                  <Text style={{ fontSize: 10, color: '#aaa' }}>(edited)</Text>
                                )}


                                {comment.author === auth.currentUser.email && (
                                  <>
                                    <Text
                                      style={{ color: 'blue', fontSize: 12, marginTop: 4 }}
                                      onPress={() => {
                                        setEditingComment({ postId: item.id, index });
                                        setEditedText(comment.text);
                                      }}
                                    >
                                      ✏️ Edit
                                    </Text>
                                    <Text
                                      style={{ color: 'red', fontSize: 12 }}
                                      onPress={() => handleDeleteComment(item.id, comment)}
                                    >
                                      🗑️ Delete
                                    </Text>
                                    <Text
                                      style={{ color: 'green', fontSize: 12, marginTop: 4 }}
                                      onPress={() => {
                                        setReplyingTo({ postId: item.id, commentIndex: index });
                                        setReplyText('');
                                      }}
                                    >
                                      💬 Reply
                                    </Text>
                                    {replyingTo?.postId === item.id && replyingTo?.commentIndex === index && (
                                      <View style={{ marginTop: 6 }}>
                                        <TextInput
                                          placeholder="Write a reply..."
                                          value={replyText}
                                          onChangeText={setReplyText}
                                          style={{
                                            borderWidth: 1,
                                            borderColor: '#ccc',
                                            borderRadius: 6,
                                            padding: 6,
                                            marginBottom: 4,
                                          }}
                                        />
                                        <Button
                                          title="Send Reply"
                                          onPress={() => handleSendReply(item.id, index)}
                                        />
                                      </View>
                                    )}
                                  </>
                                )}
                                {/* 🧵 Render replies if they exist */}
                                {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                                  <View style={{ marginTop: 6, marginLeft: 48 }}>
                                    {comment.replies.map((reply, replyIndex) => (
                                      <View
                                        key={replyIndex}
                                        style={{
                                          backgroundColor: '#e8f5e9',
                                          padding: 6,
                                          borderRadius: 8,
                                          marginBottom: 4,
                                        }}
                                      >
                                        <Text style={{ fontWeight: 'bold' }}>{reply.author}</Text>
                                        <Text>{reply.text}</Text>
                                        <Text style={{ fontSize: 10, color: '#888' }}>
                                          {reply.createdAt?.toDate
                                            ? dayjs(reply.createdAt.toDate()).fromNow()
                                            : ''}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}

                  </View>
                )}


                {/* 📝 Comment Input */}
                <View style={{ marginTop: 10 }}>
                  <TextInput
                    placeholder="Write a comment..."
                    value={commentText[item.id] || ''}
                    onChangeText={(text) =>
                      setCommentText((prev) => ({ ...prev, [item.id]: text }))
                    }
                    style={styles.commentInput}
                  />
                  {commentLoading && (
                    <Text style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                      Posting...
                    </Text>
                  )}
                  <Button
                    title="Send"
                    onPress={() => handleAddComment(item.id)}
                  />
                </View>
              </View>
            );
          }}

          refreshing={refreshing}
          onRefresh={handleRefresh}
        />


      </View>
    </ScrollView>
  );
}

