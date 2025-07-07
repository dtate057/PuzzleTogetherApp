// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBecGP8JWWo54aa1_9ypkBPa83o-Lt_3oA",
  authDomain: "puzzletogetherapp.firebaseapp.com",
  projectId: "puzzletogetherapp",
  storageBucket: "puzzletogetherapp.firebasestorage.app",
  messagingSenderId: "928712804134",
  appId: "1:928712804134:web:fbafac0cb03e1620d223e7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
