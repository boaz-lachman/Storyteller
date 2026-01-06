/**
 * Firebase Authentication Service
 * Provides functions for user authentication operations
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  AuthError,
} from 'firebase/auth';
import { auth } from '../../config/firebase';

/**
 * Sign up a new user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to the user credential
 * @throws AuthError if sign up fails
 */
export const signUp = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(authError.message || 'Failed to sign up');
  }
};

/**
 * Sign in an existing user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to the user credential
 * @throws AuthError if sign in fails
 */
export const signIn = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(authError.message || 'Failed to sign in');
  }
};

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 * @throws AuthError if sign out fails
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(authError.message || 'Failed to sign out');
  }
};

/**
 * Send a password reset email to the user
 * @param email - User's email address
 * @returns Promise that resolves when email is sent
 * @throws AuthError if password reset fails
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(authError.message || 'Failed to send password reset email');
  }
};

/**
 * Set up an authentication state change listener
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function to remove the listener
 */
export const setupAuthStateListener = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get the current user
 * @returns The current user or null if not authenticated
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Check if a user is currently authenticated
 * @returns true if user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};
