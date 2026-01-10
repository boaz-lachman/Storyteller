/**
 * Firebase configuration and initialization
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Firebase configuration from environment variables
 */

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseAPIKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  appId: Platform.OS === 'ios' ? Constants.expoConfig?.extra?.firebaseIosAppId :Constants.expoConfig?.extra?.firebaseAndroidAppId,
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
