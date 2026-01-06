/**
 * Forgot Password hook
 * Handles forgot password form state, validation, and submission
 */
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch } from './redux';
import { setError, clearError } from '../store/slices/authSlice';
import { showSnackbar } from '../store/slices/uiSlice';
import { resetPassword } from '../services/firebase/auth';
import { isValidEmail } from '../utils/validation';

type AuthStackParamList = {
  Login: undefined;
};

type ForgotPasswordNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const useForgotPassword = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Validate email field
   */
  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  /**
   * Handle password reset
   */
  const handleResetPassword = async () => {
    dispatch(clearError());

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email.trim());
      setIsSuccess(true);
      dispatch(showSnackbar({ 
        message: 'Password reset email sent! Check your inbox.', 
        type: 'success' 
      }));
      
      // Navigate back to login after a short delay
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send password reset email. Please try again.';
      dispatch(setError(errorMessage));
      dispatch(showSnackbar({ message: errorMessage, type: 'error' }));
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate back to login screen
   */
  const handleNavigateToLogin = () => {
    navigation.navigate('Login');
  };

  /**
   * Update email and clear error if exists
   */
  const updateEmail = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  return {
    // State
    email,
    emailError,
    isLoading,
    isSuccess,

    // Actions
    updateEmail,
    handleResetPassword,
    handleNavigateToLogin,
  };
};
