/**
 * Story Detail Screen
 * Container component that fetches story data and sets up tab navigation
 * Displays story title in header and renders StoryNavigator with tabs
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { useGetStoryQuery } from '../../store/api/storiesApi';
import StoryNavigator from '../../navigation/StoryNavigator';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

type StoryDetailRouteProp = RouteProp<AppStackParamList, 'StoryDetail'>;
type StoryDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'StoryDetail'>;

/**
 * Story Detail Screen Component
 * - Gets story ID from route params
 * - Fetches story data using RTK Query
 * - Sets up header with story title
 * - Renders StoryNavigator with tab navigation
 */
export default function StoryDetailScreen() {
  const route = useRoute<StoryDetailRouteProp>();
  const navigation = useNavigation<StoryDetailNavigationProp>();
  const { storyId } = route.params;

  // Fetch story data
  const {
    data: story,
    isLoading,
    isError,
    error,
  } = useGetStoryQuery(storyId);

  // Set header title and configure navigation when story data is loaded
  useEffect(() => {
    if (story?.title) {
      navigation.setOptions({
        title: story.title,
        headerTitle: story.title,
        headerBackVisible: false, // Hide back button
      });
    } else {
      navigation.setOptions({
        headerBackVisible: false,
      });
    }
  }, [story?.title, navigation]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <MainBookActivityIndicator size={80} />
        <Text style={styles.loadingText}>Loading story...</Text>
      </View>
    );
  }

  // Show error state
  if (isError || !story) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Error Loading Story</Text>
        <Text style={styles.errorText}>
          {error && 'error' in error ? error.error : 'Story not found'}
        </Text>
      </View>
    );
  }

  // Render StoryNavigator with tabs
  return <StoryNavigator route={route} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
