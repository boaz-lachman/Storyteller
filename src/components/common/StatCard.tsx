/**
 * Stat Card Component
 * Displays a single statistic with icon, value, and label
 * Reusable across different screens
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  animated?: boolean;
  animationDelay?: number;
}

/**
 * Statistics Card Component
 */
export const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  label, 
  value, 
  animated = false,
  animationDelay = 0,
}) => {
  const cardContent = (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statCardContent}>
        {icon}
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Card.Content>
    </Card>
  );

  if (animated) {
    return (
      <Animated.View 
        entering={SlideInDown.delay(animationDelay).duration(400)} 
        style={styles.statCardWrapper}
      >
        {cardContent}
      </Animated.View>
    );
  }

  return (
    <View style={styles.statCardWrapper}>
      {cardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  statCardWrapper: {
    width: '48%',
    marginBottom: spacing.md,
  },
  statCard: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default StatCard;
