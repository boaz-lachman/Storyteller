/**
 * Firebase configuration and initialization
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase configuration from environment variables
 */
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  appId: process.env.FIREBASE_APP_ID,
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

/**
 * Initialize Firebase Auth
 * For React Native, getAuth automatically uses AsyncStorage for persistence
 */
const auth: Auth = getAuth(app);

/**
 * Initialize Firestore
 */
const db: Firestore = getFirestore(app);

export { app, auth, db };
export default app;
