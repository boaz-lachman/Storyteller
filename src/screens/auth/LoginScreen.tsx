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
  I18nManager,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Input } from '../../components/forms/Input';
import { PaperButton } from '../../components/forms/PaperButton';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useLogin } from '../../hooks/useLogin';

/**
 * Login Screen Component
 */
export default function LoginScreen() {
  const isRTL = I18nManager.isRTL;
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
          {/* Title */}
          <Text style={[styles.title, isRTL && styles.titleRTL]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
            Sign in to continue
          </Text>

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
          />

          {/* Password Input */}
          <Input
            label="Password"
            value={password}
            onChangeText={updatePassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={passwordError}
            required
            style={styles.input}
          />

          {/* Forgot Password Link */}
          <PaperButton
            onPress={handleForgotPassword}
            style={styles.forgotPasswordButton}
            labelStyle={styles.forgotPasswordText}
          >
            Forgot Password?
          </PaperButton>

          {/* Login Button */}
          <PaperButton
            variant="primary"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={styles.loginButton}
          >
            Sign In
          </PaperButton>

          {/* Sign Up Link */}
          <View style={[styles.signupContainer, isRTL && styles.signupContainerRTL]}>
            <Text style={[styles.signupText, isRTL && styles.signupTextRTL]}>
              Don't have an account?{' '}
            </Text>
            <PaperButton
              onPress={handleNavigateToSignup}
              labelStyle={styles.signupLink}
            >
              Sign Up
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
  signupContainerRTL: {
    flexDirection: 'row-reverse',
  },
  signupText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  signupTextRTL: {
    textAlign: 'right',
  },
  signupLink: {
    color: colors.primary,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
  },
});
