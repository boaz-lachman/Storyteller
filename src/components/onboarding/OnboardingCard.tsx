/**
 * Onboarding Card Component
 * Individual card for onboarding screens
 * Task 15.7: Add animations (fade in effects)
 * Task 15.8: Polish design (consistent styling, clear text)
 */
import React from 'react';
import { View, StyleSheet, I18nManager } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, Feather, AntDesign } from '@expo/vector-icons';

export interface OnboardingCardData {
  icon: string; // Icon name from @expo/vector-icons
  iconFamily?: 'Feather' | 'Ionicons' | 'MaterialIcons' | 'MaterialCommunityIcons'| 'AntDesign';
  title: string;
  description: string;
}

export interface OnboardingCardProps {
  data: OnboardingCardData;
}

/**
 * Onboarding Card Component
 * Displays a single onboarding card with icon, title, and description
 */
export const OnboardingCard: React.FC<OnboardingCardProps> = ({ data }) => {
  const isRTL = I18nManager.isRTL;

  // Get icon component based on family
  const getIconComponent = () => {
    switch (data.iconFamily) {
      case 'Ionicons':
        return Ionicons;
      case 'MaterialIcons':
        return MaterialIcons;
     case 'AntDesign':
        return AntDesign;
      case 'MaterialCommunityIcons':
        return MaterialCommunityIcons;
      case 'Feather':
      default:
        return Feather;
    }
  };

  const IconComponent = getIconComponent();

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.duration(500).delay(100).springify()}
        style={styles.iconContainer}
      >
        <IconComponent name={data.icon as any} size={80} color={colors.primary} />
      </Animated.View>
      <Animated.Text
        entering={FadeInUp.duration(500).delay(200).springify()}
        style={[styles.title, isRTL && styles.titleRTL]}
      >
        {data.title}
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.duration(500).delay(300).springify()}
        style={[styles.description, isRTL && styles.descriptionRTL]}
      >
        {data.description}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    maxWidth: 600, // Better layout on tablets
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  titleRTL: {
    textAlign: 'right',
  },
  description: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.lg,
    paddingHorizontal: spacing.md,
    maxWidth: 500, // Better readability on larger screens
  },
  descriptionRTL: {
    textAlign: 'right',
  },
});

export default OnboardingCard;
