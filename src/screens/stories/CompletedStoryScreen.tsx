/**
 * Completed Story Screen
 * Displays the generated story content for completed stories
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Menu, Portal, Badge } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather, Entypo, Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import { useGetStoryQuery } from '../../store/api/storiesApi';
import { useGetCharactersQuery } from '../../store/api/charactersApi';
import { useGetBlurbsQuery } from '../../store/api/blurbsApi';
import { useGetScenesQuery } from '../../store/api/scenesApi';
import { useGetChaptersQuery } from '../../store/api/chaptersApi';
import { EmptyState } from '../../components/common/EmptyState';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { StoryPlayer } from '../../components/player/StoryPlayer';
import { ExportModal } from '../../components/modals/ExportModal';
import { GradientBackground } from '../../components/common/GradientBackground';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { formatWordCount } from '../../utils/formatting';
import { useTranslation } from '../../hooks/useTranslation';

type CompletedStoryScreenRouteProp = RouteProp<StoryTabParamList, 'CompletedStory'>;

interface CompletedStoryScreenProps {
  route: CompletedStoryScreenRouteProp;
}

/**
 * Completed Story Screen Component
 */
export default function CompletedStoryScreen({ route }: CompletedStoryScreenProps) {
  const { t } = useTranslation();
  const { storyId } = route.params;
  const [formatOption, setFormatOption] = useState<'formatted' | 'raw'>('formatted');
  const [formatMenuVisible, setFormatMenuVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const { data: story, isLoading } = useGetStoryQuery(storyId);
  
  // Fetch entities for export
  const { data: characters = [] } = useGetCharactersQuery({ storyId });
  const { data: blurbs = [] } = useGetBlurbsQuery({ storyId });
  const { data: scenes = [] } = useGetScenesQuery({ storyId });
  const { data: chapters = [] } = useGetChaptersQuery({ storyId });

  // Parse content to identify sections and check for cut-off chunks
  const parsedSections = useMemo(() => {
    if (!story?.generatedContent) return [];
    
    const cutOffChunks = story.cutOffChunks || [];
    const sections: Array<{ 
      header: string; 
      content: string; 
      chunkNumber: number | null;
      isCutOff: boolean;
    }> = [];
    
    // Match chapter/section headers: # Chapter X: Title or # Section X: Title
    const headerRegex = /^#\s+(Chapter|Section)\s+(\d+):\s*(.+)$/gm;
    const content = story.generatedContent;
    const matches: Array<{ index: number; headerText: string; chunkNumber: number }> = [];
    
    // Find all matches first
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
      matches.push({
        index: match.index,
        headerText: match[0],
        chunkNumber: parseInt(match[2], 10),
      });
    }
    
    // If no headers found, treat entire content as one section
    if (matches.length === 0) {
      sections.push({
        header: '',
        content: content,
        chunkNumber: cutOffChunks.includes(1) ? 1 : null,
        isCutOff: cutOffChunks.includes(1),
      });
      return sections;
    }
    
    // Process each section
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      const sectionStart = currentMatch.index + currentMatch.headerText.length;
      const sectionEnd = nextMatch ? nextMatch.index : content.length;
      const sectionContent = content.substring(sectionStart, sectionEnd).trim();
      
      sections.push({
        header: currentMatch.headerText,
        content: sectionContent,
        chunkNumber: currentMatch.chunkNumber,
        isCutOff: cutOffChunks.includes(currentMatch.chunkNumber),
      });
    }
    
    return sections;
  }, [story?.generatedContent, story?.cutOffChunks]);

  // Show loading state
  if (isLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <MainBookActivityIndicator size={80} />
          <Text style={styles.loadingText}>{t('stories:completed.loading')}</Text>
        </View>
      </GradientBackground>
    );
  }

  // Show empty state if no generated content
  if (!story || !story.generatedContent) {
    return (
      <GradientBackground style={styles.container}>
        <EmptyState
          title={t('stories:completed.emptyTitle')}
          message={t('stories:completed.emptyMessage')}
          icon={<Feather name="book-open" size={64} color={colors.textSecondary} />}
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{story.title}</Text>
            {story.generatedAt && (
              <Text style={styles.subtitle}>
                {t('stories:completed.generatedOn')} {new Date(story.generatedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => setExportModalVisible(true)}
          >
            <Entypo name="export" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Story Stats */}
      {story.wordCount && (
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Feather name="file-text" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{formatWordCount(story.wordCount, t)}</Text>
                </View>
                {story.cutOffChunks && story.cutOffChunks.length > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons name="warning" size={16} color={colors.warning} />
                    <Text style={[styles.statText, styles.warningText]}>
                      {t('stories:completed.incompleteSections', { 
                        count: story.cutOffChunks.length, 
                        plural: story.cutOffChunks.length > 1 ? 's' : '' 
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      )}

      {/* Story Player */}
      <Animated.View entering={FadeInDown.delay(175).duration(400)}>
        <StoryPlayer text={story.generatedContent || ''} title={story.title} />
      </Animated.View>

      {/* Story Content */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>{t('stories:completed.storyTitle')}</Text>
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
                  title={t('stories:completed.formatFormatted')}
                />
                <Menu.Item
                  onPress={() => {
                    setFormatOption('raw');
                    setFormatMenuVisible(false);
                  }}
                  title={t('stories:completed.formatRaw')}
                />
              </Menu>
            </View>

            <ScrollView
              style={styles.storyContentContainer}
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              {formatOption === 'raw' ? (
                <Text
                  style={styles.storyContentRaw}
                  selectable
                >
                  {story.generatedContent}
                </Text>
              ) : (
                <View>
                  {parsedSections.map((section, index) => (
                    <View key={index} style={styles.sectionContainer}>
                      {section.header && (
                        <View style={styles.sectionHeaderContainer}>
                          <Text
                            style={[
                              styles.sectionHeader,
                              section.isCutOff && styles.sectionHeaderCutOff,
                            ]}
                            selectable
                          >
                            {section.header}
                          </Text>
                          {section.isCutOff && (
                            <View style={styles.cutOffBadge}>
                              <Ionicons name="warning" size={16} color={colors.error} />
                              <Text style={styles.cutOffText}>{t('stories:completed.incompleteBadge')}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      <Text
                        style={[
                          styles.storyContent,
                          section.isCutOff && styles.storyContentCutOff,
                        ]}
                        selectable
                      >
                        {section.content}
                      </Text>
                      {section.isCutOff && section.content && (
                        <View style={styles.cutOffWarning}>
                          <Ionicons name="alert-circle" size={14} color={colors.warning} />
                          <Text style={styles.cutOffWarningText}>
                            {t('stories:completed.cutOffWarning')}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Card.Content>
        </Card>
      </Animated.View>

      {/* Export Modal */}
      <Portal>
        {story && (
          <ExportModal
            visible={exportModalVisible}
            onDismiss={() => setExportModalVisible(false)}
            story={story}
            entities={{
              characters,
              blurbs,
              scenes,
              chapters,
            }}
          />
        )}
      </Portal>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed - GradientBackground handles the background
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    // backgroundColor removed - GradientBackground handles the background
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  exportButton: {
    padding: spacing.sm,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginLeft: spacing.md,
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
  sectionContainer: {
    marginBottom: spacing.md,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    flex: 1,
  },
  sectionHeaderCutOff: {
    color: colors.warning,
  },
  cutOffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  cutOffText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.warning,
  },
  storyContentCutOff: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    paddingLeft: spacing.sm,
    opacity: 0.9,
  },
  cutOffWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    padding: spacing.sm,
    borderRadius: spacing.xs,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  cutOffWarningText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    color: colors.warning,
    flex: 1,
    lineHeight: 16,
  },
  warningText: {
    color: colors.warning,
  },
});
