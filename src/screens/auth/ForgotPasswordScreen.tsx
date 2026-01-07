/**
 * Forgot Password Screen
 * Allows users to request a password reset email
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
import { theme } from '../../constants/theme';
import { useForgotPassword } from '../../hooks/useForgotPassword';

/**
 * Forgot Password Screen Component
 */
export default function ForgotPasswordScreen() {
  const isRTL = I18nManager.isRTL;
  const {
    email,
    emailError,
    isLoading,
    isSuccess,
    updateEmail,
    handleResetPassword,
    handleNavigateToLogin,
  } = useForgotPassword();

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
            Forgot Password?
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
            {isSuccess
              ? 'Password reset email sent! Check your inbox and follow the instructions to reset your password.'
              : 'Enter your email address and we\'ll send you a link to reset your password.'}
          </Text>

          {!isSuccess ? (
            <>
              {/* Email Input */}
              <Input
                label="Email"
                value={email}
                onChangeText={updateEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
                required
                style={styles.input}
                editable={!isLoading}
              />

              {/* Reset Password Button */}
              <PaperButton
                variant="primary"
                onPress={handleResetPassword}
                loading={isLoading}
                disabled={isLoading}
                style={styles.resetButton}
              >
                Send Reset Link
              </PaperButton>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Text style={[styles.successText, isRTL && styles.successTextRTL]}>
                You will be redirected to the login screen shortly...
              </Text>
            </View>
          )}

          {/* Back to Login Link */}
          <View style={[styles.loginContainer, isRTL && styles.loginContainerRTL]}>
            <Text style={[styles.loginText, isRTL && styles.loginTextRTL]}>
              Remember your password?{' '}
            </Text>
            <PaperButton
            variant="text"
              onPress={handleNavigateToLogin}
              labelStyle={styles.loginLink}
            >
              Sign In
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
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
  },
  subtitleRTL: {
    textAlign: 'right',
  },
  input: {
    marginBottom: spacing.md,
  },
  resetButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  successContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: theme.borderRadius.md,
  },
  successText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
    textAlign: 'left',
  },
  successTextRTL: {
    textAlign: 'right',
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
