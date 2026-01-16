/**
 * Login Screen
 * Email and password login with navigation to signup and forgot password
 */
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Input } from '../../components/forms/Input';
import { PaperButton } from '../../components/forms/PaperButton';
import Logo from '../../components/common/Logo';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useLogin } from '../../hooks/useLogin';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Login Screen Component
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const {
    email,
    password,
    emailError,
    passwordError,
    isLoading,
    updateEmail,
    updatePassword,
    handleLogin,
    handleNavigateToSignup,
    handleForgotPassword,
  } = useLogin();

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
          <Text style={[styles.title]}>
            {t('auth:login.title')}
          </Text>
          <Text style={[styles.subtitle]}>
            {t('auth:login.subtitle')}
          </Text>

          {/* Email Input */}
          <Input
            label={t('auth:login.email')}
            value={email}
            onChangeText={updateEmail}
            placeholder={t('auth:login.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailError}
            required
            style={styles.input}
          />

          {/* Password Input */}
          <Input
            label={t('auth:login.password')}
            value={password}
            onChangeText={updatePassword}
            placeholder={t('auth:login.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={passwordError}
            required
            style={styles.input}
          />

          {/* Forgot Password Link */}
          <PaperButton
            variant="text"
            onPress={handleForgotPassword}
            style={styles.forgotPasswordButton}
            labelStyle={styles.forgotPasswordText}
          >
            {t('auth:login.forgotPassword')}
          </PaperButton>

          {/* Login Button */}
          <PaperButton
            variant="primary"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={styles.loginButton}
          >
            {t('auth:login.signInButton')}
          </PaperButton>

          {/* Sign Up Link */}
          <View style={[styles.signupContainer]}>
            <Text style={styles.signupText}>
              {t('auth:login.signUpPrompt')}{' '}
            </Text>
            <PaperButton
            variant="text"
              onPress={handleNavigateToSignup}
              labelStyle={styles.signupLink}
            >
              {t('auth:login.signUpLink')}
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
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'left',
  },
  input: {
    marginBottom: spacing.md,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
  },
  loginButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signupText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  signupLink: {
    color: colors.primary,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
  },
});
