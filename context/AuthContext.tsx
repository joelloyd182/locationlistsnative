import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import React, { createContext, useState, useContext, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;  // ADD THIS
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '133244555401-4iekvf165g7a1h227udp7ig5pt9l2cpk.apps.googleusercontent.com',
});

  useEffect(() => {
  console.log('Setting up auth listener...');
  // Listen for auth state changes
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? user.email : 'no user');
    setUser(user);
    setLoading(false);
  });

  return unsubscribe;
}, []);

  const signIn = async (email: string, password: string) => {
  console.log('AuthContext signIn called with:', email);
  const result = await signInWithEmailAndPassword(auth, email, password);
  console.log('Sign in result:', result.user.email);
};

  const signUp = async (email: string, password: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  
  // Save user profile to Firestore
  const userRef = doc(db, 'users', result.user.uid);
  await setDoc(userRef, {
    email: result.user.email,
    displayName: result.user.email?.split('@')[0], // Use email prefix as name
    createdAt: new Date().toISOString(),
  });
};
  
  const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const googleCredential = GoogleAuthProvider.credential(userInfo.data?.idToken);
    const result = await signInWithCredential(auth, googleCredential);
    
    // Save/update user profile
    const userRef = doc(db, 'users', result.user.uid);
    await setDoc(userRef, {
      email: result.user.email,
      displayName: result.user.displayName || result.user.email?.split('@')[0],
      photoURL: result.user.photoURL,
      createdAt: new Date().toISOString(),
    }, { merge: true }); // merge: true won't overwrite existing data
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}