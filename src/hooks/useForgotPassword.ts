/**
 * Forgot Password hook
 * Handles forgot password form state, validation, and submission
 */
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from './redux';
import { setError, clearError } from '../store/slices/authSlice';
import { showSnackbar } from '../store/slices/uiSlice';
import { resetPassword } from '../services/firebase/auth';
import { isValidEmail } from '../utils/validation';
import { selectLanguage } from '../store/slices/languageSlice';
import { translate } from '../services/translation/translationService';

type AuthStackParamList = {
  Login: undefined;
};

type ForgotPasswordNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const useForgotPassword = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Validate email field
   */
  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setEmailError(translate(language, 'auth:forgotPassword.emailRequired'));
      return false;
    } else if (!isValidEmail(email)) {
      setEmailError(translate(language, 'auth:forgotPassword.invalidEmail'));
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
        message: translate(language, 'auth:forgotPassword.resetEmailSent'), 
        type: 'success' 
      }));
      
      // Navigate back to login after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      const defaultError = translate(language, 'auth:forgotPassword.resetFailed');
      const errorMessage = error instanceof Error ? error.message : defaultError;
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
    navigation.goBack();
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
