/**
 * Input component with label, error message, and RTL/LTR support
 * Styled with theme and typography
 * Supports show/hide password toggle for secure text entry
 */
import React, { useState } from 'react';
import { View, StyleSheet, I18nManager, TextInputProps, TouchableOpacity } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export interface InputProps extends Omit<TextInputProps, 'theme' | 'selectionColor' | 'cursorColor'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: object;
}

/**
 * Input component with label and error message support
 * Includes show/hide password toggle for secure text entry fields
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  style,
  secureTextEntry,
  ...textInputProps
}) => {
  const isRTL = I18nManager.isRTL;
  const hasError = !!error;
  const [showPassword, setShowPassword] = useState(false);

  // Determine text alignment based on RTL/LTR
  const textAlign = isRTL ? 'right' : 'left';

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine if we should show the password toggle
  const shouldShowPasswordToggle = secureTextEntry === true;

  // Calculate actual secureTextEntry value
  const actualSecureTextEntry = shouldShowPasswordToggle ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      <View>
        <TextInput
          {...textInputProps}
          label={required && label ? `${label} *` : label}
          mode="outlined"
          error={hasError}
          secureTextEntry={actualSecureTextEntry}
          style={[
            styles.input,
            style,
            isRTL && styles.inputRTL,
          ]}
          contentStyle={[
            styles.inputContent,
            { textAlign },
            isRTL && styles.inputContentRTL,
          ]}
          outlineColor={hasError ? colors.error : colors.border}
          activeOutlineColor={hasError ? colors.error : colors.primary}
          textColor={colors.text}
          placeholderTextColor={colors.textTertiary}
          right={
            shouldShowPasswordToggle ? (
              <TextInput.Icon
                icon={() => (
                  <TouchableOpacity
                    onPress={togglePasswordVisibility}
                    style={styles.eyeIconContainer}
                    activeOpacity={0.7}
                  >
                    <AntDesign
                      name={showPassword ? 'eye' : 'eye-invisible'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              />
            ) : undefined
          }
          theme={{
            colors: {
              primary: colors.primary,
              error: colors.error,
              text: colors.text,
              placeholder: colors.textTertiary,
              background: colors.surface,
            },
          }}
        />
        {(error || helperText) && (
          <HelperText
            type={hasError ? 'error' : 'info'}
            visible
            style={[
              styles.helperText,
              isRTL && styles.helperTextRTL,
            ]}
          >
            {error || helperText}
          </HelperText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
    letterSpacing: typography.letterSpacing.normal,
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputContent: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
    letterSpacing: typography.letterSpacing.normal,
    color: colors.text,
  },
  inputContentRTL: {
    textAlign: 'right',
  },
  helperText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal * typography.fontSize.xs,
    letterSpacing: typography.letterSpacing.normal,
  },
  helperTextRTL: {
    textAlign: 'right',
  },
  eyeIconContainer: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Input;
