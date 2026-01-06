/**
 * Input component with label, error message, and RTL/LTR support
 * Styled with theme and typography
 */
import React from 'react';
import { View, StyleSheet, I18nManager, TextInputProps } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
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
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  style,
  ...textInputProps
}) => {
  const isRTL = I18nManager.isRTL;
  const hasError = !!error;

  // Determine text alignment based on RTL/LTR
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={[styles.container, containerStyle]}>
      <View>
        <TextInput
          {...textInputProps}
          label={required && label ? `${label} *` : label}
          mode="outlined"
          error={hasError}
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
});

export default Input;
