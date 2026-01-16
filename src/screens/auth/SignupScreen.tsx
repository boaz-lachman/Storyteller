/**
 * Signup Screen
 * Email, password, and confirm password signup with validation
 */
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Input } from '../../components/forms/Input';
import { PaperButton } from '../../components/forms/PaperButton';
import Logo from '../../components/common/Logo';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useSignup } from '../../hooks/useSignup';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppSelector } from '../../hooks/redux';
import { selectIsRTL } from '../../store/slices/languageSlice';

/**
 * Signup Screen Component
 */
export default function SignupScreen() {
  const { t } = useTranslation();
  const isRTL = useAppSelector(selectIsRTL);
  const {
    username,
    email,
    password,
    confirmPassword,
    usernameError,
    emailError,
    passwordError,
    confirmPasswordError,
    isLoading,
    updateUsername,
    updateEmail,
    updatePassword,
    updateConfirmPassword,
    handleSignup,
    handleNavigateToLogin,
  } = useSignup();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo */}
          <Logo fontSize="display" style={styles.logo} />

          {/* Title */}
          <Text style={[styles.title, isRTL && styles.titleRTL]}>
            {t('auth:signup.title')}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
            {t('auth:signup.subtitle')}
          </Text>

          {/* Username Input */}
          <Input
            label={t('auth:signup.username')}
            value={username}
            onChangeText={updateUsername}
            placeholder={t('auth:signup.usernamePlaceholder')}
            autoCapitalize="none"
            autoComplete="username"
            error={usernameError}
            required
            style={styles.input}
          />

          {/* Email Input */}
          <Input
            label={t('auth:signup.email')}
            value={email}
            onChangeText={updateEmail}
            placeholder={t('auth:signup.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailError}
            required
            style={styles.input}
          />

          {/* Password Input */}
          <Input
            label={t('auth:signup.password')}
            value={password}
            onChangeText={updatePassword}
            placeholder={t('auth:signup.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            error={passwordError}
            helperText={t('auth:signup.passwordHelper')}
            required
            style={styles.input}
          />

          {/* Confirm Password Input */}
          <Input
            label={t('auth:signup.confirmPassword')}
            value={confirmPassword}
            onChangeText={updateConfirmPassword}
            placeholder={t('auth:signup.confirmPasswordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            error={confirmPasswordError}
            required
            style={styles.input}
          />

          {/* Signup Button */}
          <PaperButton
            variant="primary"
            onPress={handleSignup}
            loading={isLoading}
            disabled={isLoading}
            style={styles.signupButton}
          >
            {t('auth:signup.signUpButton')}
          </PaperButton>

          {/* Login Link */}
          <View style={[styles.loginContainer, isRTL && styles.loginContainerRTL]}>
            <Text style={[styles.loginText, isRTL && styles.loginTextRTL]}>
              {t('auth:signup.signInPrompt')}{' '}
            </Text>
            <PaperButton
            variant='text'
              onPress={handleNavigateToLogin}
              labelStyle={styles.loginLink}
            >
              {t('auth:signup.signInLink')}
            </PaperButton>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logo: {
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'left',
  },
  titleRTL: {
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'left',
  },
  subtitleRTL: {
    textAlign: 'right',
  },
  input: {
    marginBottom: spacing.md,
  },
  signupButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginContainerRTL: {
    flexDirection: 'row-reverse',
  },
  loginText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  loginTextRTL: {
    textAlign: 'right',
  },
  loginLink: {
    color: colors.primary,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
  },
});
