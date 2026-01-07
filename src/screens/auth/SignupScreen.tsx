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

/**
 * Signup Screen Component
 */
export default function SignupScreen() {
  const isRTL = I18nManager.isRTL;
  const {
    email,
    password,
    confirmPassword,
    emailError,
    passwordError,
    confirmPasswordError,
    isLoading,
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
            Create Account
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
            Sign up to get started
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
            autoComplete="password-new"
            error={passwordError}
            helperText="Must be at least 6 characters"
            required
            style={styles.input}
          />

          {/* Confirm Password Input */}
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={updateConfirmPassword}
            placeholder="Confirm your password"
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
            Sign Up
          </PaperButton>

          {/* Login Link */}
          <View style={[styles.loginContainer, isRTL && styles.loginContainerRTL]}>
            <Text style={[styles.loginText, isRTL && styles.loginTextRTL]}>
              Already have an account?{' '}
            </Text>
            <PaperButton
            variant='text'
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
