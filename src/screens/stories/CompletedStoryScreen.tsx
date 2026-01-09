/**
 * Completed Story Screen
 * Displays the generated story content for completed stories
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Menu } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import { useGetStoryQuery } from '../../store/api/storiesApi';
import { EmptyState } from '../../components/common/EmptyState';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { formatWordCount } from '../../utils/formatting';

type CompletedStoryScreenRouteProp = RouteProp<StoryTabParamList, 'CompletedStory'>;

interface CompletedStoryScreenProps {
  route: CompletedStoryScreenRouteProp;
}

/**
 * Completed Story Screen Component
 */
export default function CompletedStoryScreen({ route }: CompletedStoryScreenProps) {
  const { storyId } = route.params;
  const [formatOption, setFormatOption] = useState<'formatted' | 'raw'>('formatted');
  const [formatMenuVisible, setFormatMenuVisible] = useState(false);

  const { data: story, isLoading } = useGetStoryQuery(storyId);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
        <Text style={styles.loadingText}>Loading story...</Text>
      </View>
    );
  }

  // Show empty state if no generated content
  if (!story || !story.generatedContent) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="No Generated Story"
          message="This story hasn't been generated yet. Go to the Generate tab to create your story."
          icon={<Feather name="book-open" size={64} color={colors.textSecondary} />}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
        <Text style={styles.title}>{story.title}</Text>
        {story.generatedAt && (
          <Text style={styles.subtitle}>
            Generated on {new Date(story.generatedAt).toLocaleDateString()}
          </Text>
        )}
      </Animated.View>

      {/* Story Stats */}
      {story.wordCount && (
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Feather name="file-text" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{formatWordCount(story.wordCount)}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      )}

      {/* Story Content */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>Story</Text>
              <Menu
                key={String(formatMenuVisible)+"3"}
                visible={formatMenuVisible}
                onDismiss={() => setFormatMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.formatSelector}
                    onPress={() => setFormatMenuVisible(true)}
                  >
                    <Feather name="settings" size={20} color={colors.primary} />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setFormatOption('formatted');
                    setFormatMenuVisible(false);
                  }}
                  title="Formatted"
                />
                <Menu.Item
                  onPress={() => {
                    setFormatOption('raw');
                    setFormatMenuVisible(false);
                  }}
                  title="Raw Text"
                />
              </Menu>
            </View>

            <ScrollView
              style={styles.storyContentContainer}
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              <Text
                style={[
                  styles.storyContent,
                  formatOption === 'raw' && styles.storyContentRaw,
                ]}
                selectable
              >
                {story.generatedContent}
              </Text>
            </ScrollView>
          </Card.Content>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
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
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  formatSelector: {
    padding: spacing.xs,
  },
  storyContentContainer: {
    maxHeight: 600,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  storyContent: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
    lineHeight: 24,
  },
  storyContentRaw: {
    fontFamily: 'monospace',
    fontSize: typography.fontSize.sm,
  },
});
