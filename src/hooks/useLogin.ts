/**
 * Login hook
 * Handles login form state, validation, and submission
 */
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch } from './redux';
import { setUser, setError, clearError, User } from '../store/slices/authSlice';
import { showSnackbar } from '../store/slices/uiSlice';
import { signIn } from '../services/firebase/auth';
import { isValidEmail, isValidPassword } from '../utils/validation';
import type { User as FirebaseUser } from 'firebase/auth';

type AuthStackParamList = {
  Signup: undefined;
  ForgotPassword: undefined;
};

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const useLogin = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    let isValid = true;

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!isValidPassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  /**
   * Handle login
   */
  const handleLogin = async () => {
    dispatch(clearError());

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const firebaseUser: FirebaseUser = await signIn(email.trim(), password);
      
      // Map Firebase user to app user
      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
      };

      dispatch(setUser(appUser));
      dispatch(showSnackbar({ message: 'Login successful!', type: 'success' }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      dispatch(setError(errorMessage));
      dispatch(showSnackbar({ message: errorMessage, type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to signup screen
   */
  const handleNavigateToSignup = () => {
    navigation.navigate('Signup');
  };

  /**
   * Navigate to forgot password screen
   */
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  /**
   * Update email and clear error if exists
   */
  const updateEmail = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  /**
   * Update password and clear error if exists
   */
  const updatePassword = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  return {
    // State
    email,
    password,
    emailError,
    passwordError,
    isLoading,

    // Actions
    updateEmail,
    updatePassword,
    handleLogin,
    handleNavigateToSignup,
    handleForgotPassword,
  };
};
