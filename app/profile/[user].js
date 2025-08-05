import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { arrayUnion, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../../firebase';

dayjs.extend(relativeTime);

export default function ProfileScreen() {
    const { user } = useLocalSearchParams();
    const [posts, setPosts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [commentText, setCommentText] = useState({});
    const [editingComment, setEditingComment] = useState(null); // { postId, index }
    const [editedText, setEditedText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const { user: userId } = useLocalSearchParams();
    const router = useRouter();
    const [userProfiles, setUserProfiles] = useState({});
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [showFollowModal, setShowFollowModal] = useState(false);
    const [followList, setFollowList] = useState([]); // List of user objects
    const [followListTitle, setFollowListTitle] = useState(''); // "Followers" or "Following"
const [userGroups, setUserGroups] = useState([]);


    const styles = StyleSheet.create({
        commentContainer: {
            backgroundColor: '#f1f1f1',
            padding: 8,
            borderRadius: 10,
            marginTop: 6,
            marginBottom: 4,
            borderWidth: 1,
            borderColor: '#ddd',
            flex: 1,
        },

        commentAuthor: {
            fontWeight: '600',
        },
    });

    const handleAddComment = async (postId) => {
        const text = commentText[postId]?.trim();
        const userAvatar = userDoc.exists() && userDoc.data().avatar?.startsWith('http')
            ? userDoc.data().avatar
            : '';
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
                    avatar: userAvatar, // ✅ add this
                    text,
                    createdAt: new Date(),
                    reactions: { '💗': 0, '🙏': 0, '🤗': 0 }
                }),
            });

            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? {
                            ...p, comments: [...(p.comments || []), {
                                author: auth.currentUser.email,
                                text,
                                createdAt: new Date(),
                                reactions: { '💗': 0, '🙏': 0, '🤗': 0 }
                            }]
                        }
                        : p
                )
            );

            setCommentText((prev) => ({ ...prev, [postId]: '' }));
        } catch (error) {
            console.error("Error adding comment:", error);
            Alert.alert("Error", "Couldn't post your comment.");
        }

        setCommentLoading(false); // ✅ Done loading
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
    const handleFollowToggle = async () => {
        const currentUserId = auth.currentUser.uid;
        const profileUserId = user;

        const currentUserRef = doc(db, 'users', currentUserId);
        const profileUserRef = doc(db, 'users', profileUserId);

        try {
            if (isFollowing) {
                // 🔽 Unfollow
                await updateDoc(currentUserRef, {
                    following: arrayRemove(profileUserId)
                });
                await updateDoc(profileUserRef, {
                    followers: arrayRemove(currentUserId)
                });
            } else {
                // 🔼 Follow
                await updateDoc(currentUserRef, {
                    following: arrayUnion(profileUserId)
                });
                await updateDoc(profileUserRef, {
                    followers: arrayUnion(currentUserId)
                });
            }

            setIsFollowing((prev) => !prev); // Toggle local state
        } catch (error) {
            console.error('Failed to update follow status:', error);
            Alert.alert('Error', 'Failed to update follow status');
        }
    };
    const fetchUserList = async (ids) => {
        const users = [];

        for (const uid of ids) {
            try {
                console.log('Fetching user with UID:', uid); // ✅ debug
                const snap = await getDoc(doc(db, 'users', uid));
                if (snap.exists()) {
                    const data = snap.data();
                    console.log('✅ Found user:', data.email); // confirm email
                    users.push({ id: uid, ...data });
                } else {
                    console.warn('❌ No user found for UID:', uid);
                }
            } catch (e) {
                console.error('🔥 Error fetching user for UID:', uid, e);
            }
        }

        return users;
    };



    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch posts by this user
                const q = query(collection(db, 'posts'), where('authorId', '==', user));
                const postSnap = await getDocs(q);
                setPosts(postSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Fetch user profile from Firestore (based on UID)
                const userSnap = await getDoc(doc(db, 'users', user));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const userRef = doc(db, 'users', user);

                    const updates = {};
                    if (!Array.isArray(userData.following)) updates.following = [];
                    if (!Array.isArray(userData.followers)) updates.followers = [];

                    if (Object.keys(updates).length > 0) {
                        await updateDoc(userRef, updates);
                    }

                    setProfile({ ...userData, ...updates });
                    setFollowerCount((userData.followers || []).length);
                    setFollowingCount((userData.following || []).length);
                }
                else {
                    console.warn("No user profile found for UID:", user);
                    setProfile(null);
                }

            } catch (err) {
                console.error("Error fetching user data:", err);
            }
        };
        const fetchUserGroups = async () => {
            const q = query(collection(db, 'groups'), where('members', 'array-contains', auth.currentUser.uid));
            const snapshot = await getDocs(q);
            const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserGroups(groups);
        };
        if (user) {
            fetchUserData();
            fetchUserGroups();

        }
    }, [user]); // 🔁 Rerun when the `user` (UID) in the route changes
    useEffect(() => {
        const uniqueAuthorIds = new Set();

        posts.forEach((post) => {
            (post.comments || []).forEach((comment) => {
                if (comment.authorId && !userProfiles[comment.authorId]) {
                    uniqueAuthorIds.add(comment.authorId);
                }
            });
        });

        uniqueAuthorIds.forEach((uid) => {
            fetchUserProfile(uid); // 👈 this should already exist in your component
        });
    }, [posts]);
    useEffect(() => {
        const checkIfFollowing = async () => {
            if (!auth.currentUser?.uid || !user) return;
            try {
                const currentUserSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
                const following = currentUserSnap.data()?.following || [];
                setIsFollowing(following.includes(user));
            } catch (err) {
                console.error('Error checking follow status:', err);
            }
        };

        checkIfFollowing();
    }, [user]);
    const fetchUserProfile = async (uid) => {
        if (userProfiles[uid]) return; // already fetched
        try {
            const docRef = doc(db, 'users', uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setUserProfiles((prev) => ({
                    ...prev,
                    [uid]: snap.data(),
                }));
            }
        } catch (err) {
            console.error(`Error fetching profile for ${uid}:`, err);
        }
    };


    return (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            {profile && (
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Image
                        source={{ uri: profile.avatarUrl }}
                        style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 8 }}>
                        {profile.email}
                    </Text>
                    <Text style={{ fontStyle: 'italic', color: '#666', marginTop: 4 }}>
                        {profile.bio || 'No bio yet'}
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <Text
                            style={{ marginRight: 16, textDecorationLine: 'underline', color: 'blue' }}
                            onPress={async () => {
                                const users = await fetchUserList(profile.followers || []);
                                setFollowList(users);
                                setFollowListTitle('Followers');
                                setShowFollowModal(true);
                            }}
                        >
                            {followerCount} Followers
                        </Text>
                        <Text
                            style={{ textDecorationLine: 'underline', color: 'blue' }}
                            onPress={async () => {
                                console.log('Fetching following:', profile.following); // ✅ DEBUG
                                const users = await fetchUserList(profile.following || []);
                                setFollowList(users);
                                setFollowListTitle('Following');
                                setShowFollowModal(true);
                            }}
                        >
                            {followingCount} Following
                        </Text>
                    </View>


                    {/* ✅ Show edit button only on own profile */}
                    {auth.currentUser?.uid === userId && (
                        <Button title="Edit Profile" onPress={() => router.push('/profile/edit')} />
                    )}
                    {auth.currentUser?.uid !== user && (
                        <Button
                            title={isFollowing ? 'Unfollow' : 'Follow'}
                            onPress={handleFollowToggle}
                        />
                    )}

                </View>

            )}


            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{user}'s Posts</Text>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={{ marginVertical: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
                        {/* 🔹 Tag and Text */}
                        <Text style={{ fontWeight: 'bold' }}>{item.tag}</Text>
                        <Text style={{ marginBottom: 4 }}>{item.text}</Text>

                        {/* 🔥 Top Post Indicator (if needed) */}
                        {item.reactions && Object.values(item.reactions).reduce((sum, val) => sum + val, 0) >= 5 && (
                            <Text style={{ color: 'orange' }}>🔥 Top Post</Text>
                        )}

                        {/* 💬 Comments Display */}
                        {Array.isArray(item.comments) && item.comments.length > 0 && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={{ fontWeight: 'bold' }}>Comments:</Text>
                                {item.comments?.map((comment, index) => {
                                    const authorProfile = userProfiles[comment.authorId] || {};
                                    return (
                                        <View
                                            key={index}
                                            style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}
                                        >
                                            <Image
                                                source={{
                                                    uri:
                                                        userProfiles[comment.authorId]?.avatarUrl ||
                                                        'https://www.gravatar.com/avatar/?d=mp',
                                                }}
                                                style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }}
                                            />
                                            <View style={styles.commentContainer}>
                                                <Text style={styles.commentAuthor}>
                                                    {userProfiles[comment.authorId]?.email || comment.author}
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
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}

                            </View>
                        )}

                        {/* 📝 Add New Comment */}
                        <View style={{ marginTop: 10 }}>
                            <TextInput
                                placeholder="Write a comment..."
                                value={commentText[item.id] || ''}
                                onChangeText={(text) =>
                                    setCommentText((prev) => ({ ...prev, [item.id]: text }))
                                }
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#ccc',
                                    borderRadius: 5,
                                    padding: 6,
                                    marginBottom: 4,
                                }}
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
<View style={{ marginTop: 24 }}>
  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Joined Groups:</Text>
  {userGroups.length === 0 ? (
    <Text style={{ color: '#888' }}>You're not in any groups yet.</Text>
  ) : (
    userGroups.map((group) => (
      <View key={group.id} style={{ paddingVertical: 4 }}>
        <Text style={{ fontSize: 15 }}>{group.name}</Text>
      </View>
    ))
  )}
</View>




                    </View>
                )}
            />
            {showFollowModal && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: '#fff',
                            padding: 20,
                            borderRadius: 10,
                            width: '80%',
                            maxHeight: '70%',
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{followListTitle}</Text>

                        <ScrollView style={{ maxHeight: 200 }}>
                            {followList.length === 0 && (
                                <Text style={{ textAlign: 'center', color: '#888' }}>No users to show.</Text>
                            )}

                            {followList.map((u, index) => (
                                <Pressable
                                    key={index}
                                    onPress={() => {
                                        setShowFollowModal(false); // hide modal
                                        router.push(`/profile/${u.id}`); // navigate to profile
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 10,
                                        padding: 6,
                                        borderRadius: 6,
                                        backgroundColor: '#f5f5f5',
                                    }}
                                >
                                    <Image
                                        source={{ uri: u.avatarUrl || 'https://www.gravatar.com/avatar/?d=mp' }}
                                        style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }}
                                    />
                                    <Text>{u.email || 'Unknown User'}</Text>
                                </Pressable>

                            ))}
                        </ScrollView>

                        <Button title="CLOSE" onPress={() => setShowFollowModal(false)} />
                    </View>
                </View>
            )}
        </ScrollView>

    );
}
