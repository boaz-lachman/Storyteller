/**
 * Signup hook
 * Handles signup form state, validation, and submission
 */
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch } from './redux';
import { setUser, setError, clearError, User } from '../store/slices/authSlice';
import { showSnackbar } from '../store/slices/uiSlice';
import { signUp } from '../services/firebase/auth';
import { isValidEmail, isValidPassword, passwordsMatch } from '../utils/validation';
import type { User as FirebaseUser } from 'firebase/auth';

type AuthStackParamList = {
  Login: undefined;
};

type SignupNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const useSignup = () => {
  const navigation = useNavigation<SignupNavigationProp>();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
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

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (!passwordsMatch(password, confirmPassword)) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  };

  /**
   * Handle signup
   */
  const handleSignup = async () => {
    dispatch(clearError());

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const firebaseUser: FirebaseUser = await signUp(email.trim(), password);
      
      // Map Firebase user to app user
      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
      };

      dispatch(setUser(appUser));
      dispatch(showSnackbar({ message: 'Account created successfully!', type: 'success' }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      dispatch(setError(errorMessage));
      dispatch(showSnackbar({ message: errorMessage, type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to login screen
   */
  const handleNavigateToLogin = () => {
    navigation.goBack();
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
    // Clear confirm password error if passwords now match
    if (confirmPassword && passwordsMatch(text, confirmPassword)) {
      setConfirmPasswordError('');
    }
  };

  /**
   * Update confirm password and clear error if exists
   */
  const updateConfirmPassword = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) {
      if (passwordsMatch(password, text)) {
        setConfirmPasswordError('');
      }
    }
  };

  return {
    // State
    email,
    password,
    confirmPassword,
    emailError,
    passwordError,
    confirmPasswordError,
    isLoading,

    // Actions
    updateEmail,
    updatePassword,
    updateConfirmPassword,
    handleSignup,
    handleNavigateToLogin,
  };
};
