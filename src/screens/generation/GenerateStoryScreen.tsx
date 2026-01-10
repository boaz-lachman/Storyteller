/**
 * Generate Story Screen
 * Displays story generation interface for a specific story
 * Includes preview of elements, generation options, and result display
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Menu, Divider } from 'react-native-paper';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import { useGetStoryQuery } from '../../store/api/storiesApi';
import {
  useGetCharactersQuery,
} from '../../store/api/charactersApi';
import {
  useGetBlurbsQuery,
} from '../../store/api/blurbsApi';
import {
  useGetScenesQuery,
} from '../../store/api/scenesApi';
import {
  useGetChaptersQuery,
} from '../../store/api/chaptersApi';
import { buildStoryPrompt, formatPromptForClaude, getDefaultSystemPrompt, type PromptBuilderOptions } from '../../utils/promptBuilder';
import { useGenerateStoryMutation } from '../../store/api/claudeApi';
import type { GenerateStoryResponse } from '../../store/api/claudeApi';
import { useUpdateStoryMutation } from '../../store/api/storiesApi';
import { isApiKeyConfigured } from '../../services/api/claudeService';
import { PaperButton } from '../../components/forms/PaperButton';
import { Input } from '../../components/forms/Input';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { EmptyState } from '../../components/common/EmptyState';
import { StatisticsCards } from '../../components/common/StatisticsCards';
import { StoryPlayer } from '../../components/player/StoryPlayer';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';
import { Ionicons } from '@expo/vector-icons';
import { formatWordCount } from '../../utils/formatting';
import { showStoryGenerationNotification, cancelNotification } from '../../services/notifications';

type GenerateStoryScreenRouteProp = RouteProp<StoryTabParamList, 'Generate'>;

interface GenerateStoryScreenProps {
  route: GenerateStoryScreenRouteProp;
}

/**
 * Generate Story Screen Component
 */
export default function GenerateStoryScreen({ route }: GenerateStoryScreenProps) {
  const { storyId } = route.params;
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Generation state
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'complex'>('moderate');
  const [style, setStyle] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [generatedStory, setGeneratedStory] = useState<GenerateStoryResponse | null>(null);
  const [formatOption, setFormatOption] = useState<'formatted' | 'raw'>('formatted');
  const [notificationId, setNotificationId] = useState<string | null>(null);

  // RTK Query mutations
  const [generateStory, { isLoading: isGenerating }] = useGenerateStoryMutation();
  const [updateStory, { isLoading: isSaving }] = useUpdateStoryMutation();

  // Menu states
  const [complexityMenuVisible, setComplexityMenuVisible] = useState(false);
  const [formatMenuVisible, setFormatMenuVisible] = useState(false);

  // Fetch story and all entities
  const { data: story, isLoading: isLoadingStory } = useGetStoryQuery(storyId);
  const { data: characters = [], isLoading: isLoadingCharacters } = useGetCharactersQuery(
    { storyId, sortBy: 'importance', order: 'DESC' },
    { skip: !storyId }
  );
  const { data: blurbs = [], isLoading: isLoadingBlurbs } = useGetBlurbsQuery(
    { storyId, sortBy: 'importance', order: 'DESC' },
    { skip: !storyId }
  );
  const { data: scenes = [], isLoading: isLoadingScenes } = useGetScenesQuery(
    { storyId, sortBy: 'importance', order: 'DESC' },
    { skip: !storyId }
  );
  const { data: chapters = [], isLoading: isLoadingChapters } = useGetChaptersQuery(
    { storyId, sortBy: 'order', order: 'ASC' },
    { skip: !storyId }
  );

  const isLoading = isLoadingStory || isLoadingCharacters || isLoadingBlurbs || isLoadingScenes || isLoadingChapters;

  // Check if API key is configured
  const apiKeyConfigured = useMemo(() => isApiKeyConfigured(), []);

  // Statistics for preview
  const statistics = useMemo(() => {
    return {
      characterCount: characters.length,
      blurbCount: blurbs.length,
      sceneCount: scenes.length,
      chapterCount: chapters.length,
    };
  }, [characters.length, blurbs.length, scenes.length, chapters.length]);

  // Handle generate story
  const handleGenerate = useCallback(async () => {
    if (!story || !user || !apiKeyConfigured) {
      if (!apiKeyConfigured) {
        dispatch(
          showSnackbar({
            message: 'Claude API key is not configured. Please set CLAUDE_API_KEY in your environment.',
            type: 'error',
          })
        );
      }
      return;
    }

    // Validate that we have at least some elements
    if (statistics.characterCount === 0 && statistics.blurbCount === 0 && statistics.sceneCount === 0 && statistics.chapterCount === 0) {
      dispatch(
        showSnackbar({
          message: 'Please add at least one character, blurb, scene, or chapter before generating a story.',
          type: 'error',
        })
      );
      return;
    }

    setGeneratedStory(null);

    // Show notification for background generation
    const notifId = await showStoryGenerationNotification();
    setNotificationId(notifId);

    try {
      // Build prompt
      const promptOptions: PromptBuilderOptions = {
        complexity,
        style: style || undefined,
        additionalInstructions: additionalInstructions || undefined,
      };

      const prompt = buildStoryPrompt(story, characters, blurbs, scenes, chapters, promptOptions);
      const systemPrompt = getDefaultSystemPrompt();
      const messages = formatPromptForClaude(prompt, systemPrompt);

      // Generate story using RTK Query mutation
      const result = await generateStory({
        messages,
        maxTokens: 4000, // Increased for longer stories
        systemPrompt,
      }).unwrap();

      // Cancel notification on success
      if (notifId) {
        await cancelNotification(notifId);
        setNotificationId(null);
      }

      if (result) {
        setGeneratedStory(result);
        dispatch(
          showSnackbar({
            message: 'Story generated successfully!',
            type: 'success',
          })
        );
      }
    } catch (error: any) {
      console.error('Error generating story:', error);
      
      // Cancel notification on error
      if (notifId) {
        await cancelNotification(notifId);
        setNotificationId(null);
      }

      const errorMessage = error?.data?.message || error?.data?.error || error?.message || 'Failed to generate story. Please try again.';
      dispatch(
        showSnackbar({
          message: errorMessage,
          type: 'error',
        })
      );
    }
  }, [story, characters, blurbs, scenes, chapters, complexity, style, additionalInstructions, user, apiKeyConfigured, dispatch, generateStory, statistics]);

  // Handle save story
  const handleSave = useCallback(async () => {
    if (!generatedStory || !story) return;

    Alert.alert(
      'Save Generated Story',
      'This will update the story with the generated content. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            try {
              await updateStory({
                id: storyId,
                data: {
                  generatedContent: generatedStory.content,
                  wordCount: generatedStory.wordCount,
                  generatedAt: Date.now(),
                  status: 'completed' as const,
                },
              }).unwrap();

              dispatch(
                showSnackbar({
                  message: 'Story saved successfully!',
                  type: 'success',
                })
              );
            } catch (error: any) {
              console.error('Error saving story:', error);
              const errorMessage = error?.error || error?.data?.error || 'Failed to save story. Please try again.';
              dispatch(
                showSnackbar({
                  message: errorMessage,
                  type: 'error',
                })
              );
            }
          },
        },
      ]
    );
  }, [generatedStory, story, storyId, updateStory, dispatch]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    setGeneratedStory(null);
    handleGenerate();
  }, [handleGenerate]);

  // Cleanup: Cancel notification if component unmounts while generation is in progress
  useEffect(() => {
    return () => {
      if (notificationId) {
        cancelNotification(notificationId).catch(console.error);
      }
    };
  }, [notificationId]);

  // Format complexity label
  const getComplexityLabel = (value: 'simple' | 'moderate' | 'complex') => {
    const labels: Record<string, string> = {
      simple: 'Simple',
      moderate: 'Moderate',
      complex: 'Complex',
    };
    return labels[value] || value;
  };

  // Show loading state
  if (isLoading) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
        <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={styles.loadingText}>
          Loading story elements...
        </Animated.Text>
      </Animated.View>
    );
  }

  // Show error if story not found
  if (!story) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Story Not Found"
          message="The story you're looking for doesn't exist."
          icon={<Ionicons name="alert-circle" size={64} color={colors.error} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
        <Text style={styles.title}>Generate Story</Text>
        <Text style={styles.subtitle}>{story.title}</Text>
      </Animated.View>

      {/* API Key Warning */}
      {!apiKeyConfigured && (
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Card style={[styles.card, styles.warningCard]}>
            <Card.Content>
              <View style={styles.warningContent}>
                <Ionicons name="warning" size={24} color={colors.warning} />
                <Text style={styles.warningText}>
                  Claude API key is not configured. Please set CLAUDE_API_KEY in your environment variables.
                </Text>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      )}

      {/* Preview Section */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Story Elements Preview</Text>
            <StatisticsCards statistics={statistics} animated={true} />
            {statistics.characterCount === 0 && statistics.blurbCount === 0 && statistics.sceneCount === 0 && statistics.chapterCount === 0 && (
              <Text style={styles.emptyPreviewText}>
                Add at least one element (character, blurb, scene, or chapter) to generate a story.
              </Text>
            )}
          </Card.Content>
        </Card>
      </Animated.View>

      {/* Generation Options */}
      {!generatedStory && (
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Generation Options</Text>

              {/* Complexity Selector */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Complexity</Text>
                <Menu
                  key={String(complexityMenuVisible)+"1"}
                  visible={complexityMenuVisible}
                  onDismiss={() => setComplexityMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.selector}
                      onPress={() => setComplexityMenuVisible(true)}
                    >
                      <Text style={styles.selectorText}>{getComplexityLabel(complexity)}</Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setComplexity('simple');
                      setComplexityMenuVisible(false);
                    }}
                    title="Simple"
                  />
                  <Menu.Item
                    onPress={() => {
                      setComplexity('moderate');
                      setComplexityMenuVisible(false);
                    }}
                    title="Moderate"
                  />
                  <Menu.Item
                    onPress={() => {
                      setComplexity('complex');
                      setComplexityMenuVisible(false);
                    }}
                    title="Complex"
                  />
                </Menu>
              </View>

              {/* Style Input */}
              <View style={styles.optionRow}>
                <Input
                  label="Writing Style (Optional)"
                  value={style}
                  onChangeText={setStyle}
                  placeholder='e.g., "literary", "conversational", "poetic", "dramatic", etc.'
                  helperText="Specify the writing style you want for the generated story"
                  containerStyle={styles.inputContainer}
                />
              </View>

              {/* Additional Instructions */}
              <View style={styles.optionRow}>
                <Input
                  label="Additional Instructions (Optional)"
                  value={additionalInstructions}
                  onChangeText={setAdditionalInstructions}
                  placeholder="Any specific requirements or preferences for the story"
                  helperText="Add any specific requirements or preferences for the story generation"
                  multiline
                  numberOfLines={4}
                  containerStyle={styles.inputContainer}
                />
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      )}

      {/* Generate Button */}
      {!generatedStory && (
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.buttonContainer}>
          <PaperButton
            variant="primary"
            onPress={handleGenerate}
            loading={isGenerating}
            disabled={isGenerating || !apiKeyConfigured || (statistics.characterCount === 0 && statistics.blurbCount === 0 && statistics.sceneCount === 0 && statistics.chapterCount === 0)}
            style={styles.generateButton}
          >
            {isGenerating ? 'Generating...' : 'Generate Story'}
          </PaperButton>
        </Animated.View>
      )}

      {/* Generated Story Result */}
      {generatedStory && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.resultHeader}>
                <Text style={styles.sectionTitle}>Generated Story</Text>
                <Menu
                  key={String(formatMenuVisible)+"2"}
                  visible={formatMenuVisible}
                  onDismiss={() => setFormatMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.formatSelector}
                      onPress={() => setFormatMenuVisible(true)}
                    >
                      <Ionicons name="options" size={20} color={colors.primary} />
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

              {/* Story Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="document-text" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{formatWordCount(generatedStory.wordCount)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="flash" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>
                    {generatedStory.usage.inputTokens + generatedStory.usage.outputTokens} tokens
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Story Player - Only shows if TTS is available for device locale */}
          <Animated.View entering={FadeInDown.delay(125).duration(400)}>
            <StoryPlayer text={generatedStory.content} />
          </Animated.View>

          <Card style={styles.card}>
            <Card.Content>
              <Divider style={styles.divider} />

              {/* Story Content */}
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
                  {generatedStory.content}
                </Text>
              </ScrollView>
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <PaperButton
              variant="outline"
              onPress={handleRegenerate}
              disabled={isGenerating}
              style={styles.actionButton}
            >
              Retry
            </PaperButton>
            <PaperButton
              variant="primary"
              onPress={handleSave}
              style={styles.actionButton}
            >
              Save
            </PaperButton>
          </View>
        </Animated.View>
      )}
      </ScrollView>

      {/* Full Screen Loading Overlay */}
      {isGenerating && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.loadingOverlay}>
          <View style={styles.loadingOverlayContent}>
            <MainBookActivityIndicator size={120} />
            <Text style={styles.generatingText}>Generating your story...</Text>
            <Text style={styles.generatingSubtext}>This may take a few minutes</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
  warningCard: {
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyPreviewText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  optionRow: {
    marginBottom: spacing.md,
  },
  optionLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
  },
  inputContainer: {
    marginBottom: 0,
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  generateButton: {
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 254, 249, 0.95)', // Semi-transparent background
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  generatingText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  generatingSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  generatingHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  formatSelector: {
    padding: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
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
  divider: {
    marginVertical: spacing.md,
  },
  storyContentContainer: {
    maxHeight: 500,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
