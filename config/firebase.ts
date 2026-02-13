import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase config from Firebase Console
// Go to: Project Settings > General > Your apps > SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuq2aD6FNl_lvP9x7s7pfus1IqOhF4w3w",
  authDomain: "location-lists-1e91c.firebaseapp.com",
  projectId: "location-lists-1e91c",
  storageBucket: "location-lists-1e91c.firebasestorage.app",
  messagingSenderId: "133244555401",
  appId: "1:133244555401:web:e82186b17f3e0e9281f658"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);