/**
 * StoryTeller Logo Component
 * Displays the app logo with adjustable font size using typography
 */
import React from 'react';
import { StyleSheet, I18nManager, ViewStyle, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { typography, type FontSizeKey } from '../../constants/typography';

export interface LogoProps {
  /**
   * Font size for the logo
   * Can be a number or a typography key (xs, sm, md, lg, xl, xxl, xxxl, display)
   * @default 'xxxl'
   */
  fontSize?: number | FontSizeKey;
  /**
   * Custom text color
   * @default colors.primary
   */
  color?: string;
  /**
   * Custom style for the container
   */
  style?: ViewStyle;
  /**
   * Custom style for the text
   */
  textStyle?: TextStyle;
  /**
   * Whether to use bold font weight
   * @default true
   */
  bold?: boolean;
}

/**
 * StoryTeller Logo Component
 */
export default function Logo({
  fontSize = 'xxxl',
  color = colors.primary,
  style,
  textStyle,
  bold = true,
}: LogoProps) {
  const isRTL = I18nManager.isRTL;

  // Resolve font size - if it's a key, get the value from typography
  const resolvedFontSize =
    typeof fontSize === 'number'
      ? fontSize
      : typography.fontSize[fontSize];

  return (
    <Text
      style={[
        styles.logo,
        {
          fontSize: resolvedFontSize,
          color,
          fontFamily: bold
            ? typography.fontFamily.bold
            : typography.fontFamily.semibold,
          fontWeight: bold
            ? typography.fontWeight.bold
            : typography.fontWeight.semibold,
        },
        isRTL && styles.logoRTL,
        textStyle,
      ]}
    >
      StoryTeller
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    textAlign: 'left',
    letterSpacing: typography.letterSpacing.normal,
  },
  logoRTL: {
    textAlign: 'right',
  },
});
