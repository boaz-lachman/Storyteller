/**
 * StoryTeller Logo Component
 * Displays the app logo with adjustable font size using typography
 * Includes a book-open icon from Feather icons
 */
import React from 'react';
import { StyleSheet, I18nManager, ViewStyle, TextStyle, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { typography, type FontSizeKey } from '../../constants/typography';
import { spacing } from '../../constants/spacing';

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

  // Icon size should be proportional to font size (slightly larger)
  const iconSize = resolvedFontSize * 1.1;

  return (
    <View
      style={[
        styles.container,
        isRTL && styles.containerRTL,
        style,
      ]}
    >
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
      <Feather
        name="book-open"
        size={iconSize}
        color={color}
        style={[
          styles.icon,
          isRTL && styles.iconRTL,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  logo: {
    textAlign: 'left',
    letterSpacing: typography.letterSpacing.normal,
    marginRight: spacing.xs,
  },
  logoRTL: {
    textAlign: 'right',
    marginRight: 0,
    marginLeft: spacing.xs,
  },
  icon: {
    marginLeft: 0,
  },
  iconRTL: {
    marginLeft: 0,
    marginRight: 0,
  },
});
