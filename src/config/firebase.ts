/**
 * Firebase configuration and initialization
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Firebase configuration from environment variables
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_FIREBASE_IOS_APP_ID : process.env.EXPO_PUBLIC_FIREBASE_ANDRIOD_APP_ID,
};

/**
 * Initialize Firebase App
 */
let app: FirebaseApp;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;
/**
 * Initialize Firebase Auth
 * Firebase Auth automatically persists to AsyncStorage in React Native
 * Credentials will persist across app restarts until logout
 */
const auth: firebaseAuth.Auth = firebaseAuth.initializeAuth(app, {
  persistence: reactNativePersistence(ReactNativeAsyncStorage)
});

/**
 * Initialize Firestore
 */
const db: Firestore = getFirestore(app);

export { app, auth, db };
export default app;
