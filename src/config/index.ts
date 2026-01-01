/**
 * App configuration
 */
export const isDev = process.env.NODE_ENV !== 'production';

/**
 * Re-export Firebase config
 */
export { app as firebaseApp, db as firestore } from './firebase';
