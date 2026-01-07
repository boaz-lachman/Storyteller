/**
 * Characters Screen
 * Displays characters for a specific story
 * Placeholder implementation
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

type CharactersScreenRouteProp = RouteProp<StoryTabParamList, 'Characters'>;

interface CharactersScreenProps {
  route: CharactersScreenRouteProp;
}

/**
 * Characters Screen Component
 */
export default function CharactersScreen({ route }: CharactersScreenProps) {
  const { storyId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Characters</Text>
      <Text style={styles.subtitle}>
        Story ID: {storyId}
      </Text>
      <Text style={styles.placeholder}>
        Characters list will appear here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  placeholder: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textTertiary,
  },
});
