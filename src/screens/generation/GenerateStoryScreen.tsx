/**
 * Generate Story Screen
 * Displays story generation interface for a specific story
 * Includes preview of elements, generation options, and result display
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Menu, Divider, Checkbox } from 'react-native-paper';
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
import { generateStoryChunked, type ChunkedGenerationProgress } from '../../services/generation/chunkedGenerationService';
import { CLAUDE_API } from '../../constants/apiConstants';
import { PaperButton } from '../../components/forms/PaperButton';
import { Input } from '../../components/forms/Input';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { EmptyState } from '../../components/common/EmptyState';
import { GradientBackground } from '../../components/common/GradientBackground';
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
import { countWords } from '../../utils/helpers';
import { isRTL } from '../../utils/languageDetection';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppSelector } from '../../hooks/redux';
import { selectLanguage } from '../../store/slices/languageSlice';
import { BookView } from '../../components/reader/BookView';

type GenerateStoryScreenRouteProp = RouteProp<StoryTabParamList, 'Generate'>;

interface GenerateStoryScreenProps {
  route: GenerateStoryScreenRouteProp;
}

/**
 * Generate Story Screen Component
 */
export default function GenerateStoryScreen({ route }: GenerateStoryScreenProps) {
  const { t } = useTranslation();
  const { storyId } = route.params;
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);

  // Generation state
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'complex'>('moderate');
  const [style, setStyle] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [ttsFriendly, setTtsFriendly] = useState<boolean>(false);
  const [generatedStory, setGeneratedStory] = useState<GenerateStoryResponse | null>(null);
  const [formatOption, setFormatOption] = useState<'formatted' | 'raw'>('formatted');
  const [cutOffChunks, setCutOffChunks] = useState<number[]>([]);
  const [useBookView, setUseBookView] = useState(true);
  
  // Chunked generation state
  const [chunkedProgress, setChunkedProgress] = useState<ChunkedGenerationProgress | null>(null);
  const [isChunkedGeneration, setIsChunkedGeneration] = useState(false);

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
            message: t('entities:generation.apiKeyWarning'),
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
          message: t('entities:generation.noElementsError'),
          type: 'error',
        })
      );
      return;
    }

    setGeneratedStory(null);
    setChunkedProgress(null);
    setIsChunkedGeneration(false);
    setCutOffChunks([]);

    try {
      const promptOptions: PromptBuilderOptions = {
        complexity,
        style: style || undefined,
        additionalInstructions: additionalInstructions || undefined,
        ttsFriendly,
      };

      // Use chunked generation for novellas (with or without chapters)
      // For novellas without chapters, we'll create virtual chunks from scenes/blurbs
      const shouldUseChunkedGeneration = story.length === 'novella' || chapters.length > 0;
      
      if (shouldUseChunkedGeneration) {
        // Validate chapter count before starting (if using chapters)
        if (chapters.length > 0 && chapters.length > CLAUDE_API.MAX_CHAPTERS_FOR_GENERATION) {
          dispatch(
            showSnackbar({
              message: t('entities:generation.tooManyChaptersError', { max: CLAUDE_API.MAX_CHAPTERS_FOR_GENERATION }),
              type: 'error',
            })
          );
          return;
        }

        setIsChunkedGeneration(true);
        
        const result = await generateStoryChunked(
          story,
          characters,
          blurbs,
          scenes,
          chapters,
          {
            ...promptOptions,
            onProgress: (progress) => {
              setChunkedProgress(progress);
            },
            onChapterComplete: (chunkNumber, content) => {
              const chunkType = chapters.length > 0 ? t('entities:generation.chunkTypes.chapter') : t('entities:generation.chunkTypes.section');
              dispatch(
                showSnackbar({
                  message: t('entities:generation.chunkComplete', { type: chunkType, number: chunkNumber }),
                  type: 'success',
                })
              );
            },
            onTokenWarning: (currentTokens, warningThreshold) => {
              dispatch(
                showSnackbar({
                  message: t('entities:generation.tokenWarning', { tokens: currentTokens.toLocaleString() }),
                  type: 'warning',
                })
              );
            },
          }
        );

        // Convert chunked result to GenerateStoryResponse format
        const chunkType = chapters.length > 0 ? t('entities:generation.chunkTypes.chapters') : t('entities:generation.chunkTypes.sections');
        const completedChunks = result.chunks.length;
        // Calculate expected total chunks
        const totalChunks = chapters.length > 0 
          ? chapters.length 
          : scenes.length > 0 
            ? Math.ceil(scenes.length / Math.max(2, Math.ceil(scenes.length / 5)))
            : blurbs.length > 0
              ? Math.ceil(blurbs.length / 3)
              : 1;
        const isComplete = completedChunks >= totalChunks && !chunkedProgress?.error;
        
        const response: GenerateStoryResponse = {
          content: result.completeContent,
          wordCount: result.totalWordCount,
          prompt: `Chunked generation for ${completedChunks} ${chunkType}`,
          usage: result.totalUsage,
          wasCutOff: result.cutOffChunks && result.cutOffChunks.length > 0,
        };

        setGeneratedStory(response);
        setCutOffChunks(result.cutOffChunks || []);
        setIsChunkedGeneration(false);
        setChunkedProgress(null);

        // Show appropriate message based on completion status
        if (isComplete) {
          dispatch(
            showSnackbar({
              message: t('entities:generation.generationChunkedSuccess', { completed: completedChunks, type: chunkType }),
              type: 'success',
            })
          );
        } else if (chunkedProgress?.error) {
          const errorMessage = typeof chunkedProgress.error === 'string' 
            ? chunkedProgress.error 
            : (chunkedProgress.error as any)?.message || String(chunkedProgress.error);
          dispatch(
            showSnackbar({
              message: t('entities:generation.generationStoppedEarly', { error: errorMessage, completed: completedChunks, type: chunkType }),
              type: 'warning',
            })
          );
        } else {
          dispatch(
            showSnackbar({
              message: t('entities:generation.generationIncomplete', { completed: completedChunks, total: totalChunks, type: chunkType }),
              type: 'warning',
            })
          );
        }
      } else {
        // Use single-call generation for short stories
        setIsChunkedGeneration(false);
        
        const prompt = buildStoryPrompt(story, characters, blurbs, scenes, chapters, promptOptions, language);
        const systemPrompt = getDefaultSystemPrompt(language, ttsFriendly);
        const messages = formatPromptForClaude(prompt, systemPrompt);

        // Generate story using RTK Query mutation
        // Use configured limit instead of Claude's max to control costs
        const result = await generateStory({
          messages,
          maxTokens: CLAUDE_API.MAX_TOKENS_SINGLE_GENERATION,
          systemPrompt,
        }).unwrap();

        if (result) {
          setGeneratedStory(result);
          // For single-call generation, if wasCutOff is true, we can't track specific chunks
          // but we can indicate the story was cut off
          if (result.wasCutOff) {
            setCutOffChunks([1]); // Mark as cut off (single chunk)
          } else {
            setCutOffChunks([]);
          }
          dispatch(
            showSnackbar({
              message: t('entities:generation.generationSuccess'),
              type: 'success',
            })
          );
        }
      }
    } catch (error: any) {
      console.error('Error generating story:', error);
      
      setIsChunkedGeneration(false);
      
      // Check if we have partial content from chunked generation
      if (isChunkedGeneration && chunkedProgress?.completedContent) {
        const partialContent = chunkedProgress.completedContent;
        if (partialContent && partialContent.trim().length > 0) {
          // Save partial content so user doesn't lose progress
          const partialWordCount = countWords(partialContent);
          const partialResponse: GenerateStoryResponse = {
            content: partialContent,
            wordCount: partialWordCount,
            prompt: 'Partial generation (stopped early)',
            usage: {
              inputTokens: 0,
              outputTokens: 0,
            },
            wasCutOff: false
          };
          setGeneratedStory(partialResponse);
          
          dispatch(
            showSnackbar({
              message: t('entities:generation.generationPartialSaved', { completed: chunkedProgress.completedChunks }),
              type: 'warning',
            })
          );
          setChunkedProgress(null);
          return;
        }
      }
      
      setChunkedProgress(null);

      // Safely extract error message, handling various error object shapes
      // Handle structure: {data: {error: {message: "...", type: "..."}, ...}}
      let errorMessage: string;
      if (error?.data?.error?.message && typeof error.data.error.message === 'string') {
        errorMessage = error.data.error.message;
      } else if (typeof error?.data?.message === 'string') {
        errorMessage = error.data.message;
      } else if (typeof error?.data?.error === 'string') {
        errorMessage = error.data.error;
      } else if (typeof error?.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error?.data === 'string') {
        errorMessage = error.data;
      } else if (error?.data && typeof error.data === 'object') {
        // Try to extract message from error.data object
        const data = error.data as any;
        if (data.error && typeof data.error === 'object' && data.error.message) {
          errorMessage = data.error.message;
        } else {
          errorMessage = data.message || JSON.stringify(data);
        }
      } else {
        errorMessage = t('entities:generation.generationFailed');
      }
      
      dispatch(
        showSnackbar({
          message: errorMessage,
          type: 'error',
        })
      );
    }
  }, [story, characters, blurbs, scenes, chapters, complexity, style, additionalInstructions, ttsFriendly, language, user, apiKeyConfigured, dispatch, generateStory, statistics, t]);

  // Handle save story
  const handleSave = useCallback(async () => {
    if (!generatedStory || !story) return;

    Alert.alert(
      t('entities:generation.saveConfirmTitle'),
      t('entities:generation.saveConfirmMessage'),
      [
        { text: t('entities:generation.saveCancel'), style: 'cancel' },
        {
          text: t('entities:generation.saveConfirm'),
          onPress: async () => {
            try {
              await updateStory({
                id: storyId,
                data: {
                  generatedContent: generatedStory.content,
                  wordCount: generatedStory.wordCount,
                  generatedAt: Date.now(),
                  status: 'completed' as const,
                  cutOffChunks: cutOffChunks.length > 0 ? cutOffChunks : undefined,
                },
              }).unwrap();

              dispatch(
                showSnackbar({
                  message: t('entities:generation.saveSuccess'),
                  type: 'success',
                })
              );
            } catch (error: any) {
              console.error('Error saving story:', error);
              // Safely extract error message, handling various error object shapes
              // Handle structure: {data: {error: {message: "...", type: "..."}, ...}}
              let errorMessage: string;
              if (error?.data?.error?.message && typeof error.data.error.message === 'string') {
                errorMessage = error.data.error.message;
              } else if (typeof error?.error === 'string') {
                errorMessage = error.error;
              } else if (typeof error?.data?.message === 'string') {
                errorMessage = error.data.message;
              } else if (typeof error?.data?.error === 'string') {
                errorMessage = error.data.error;
              } else if (typeof error?.message === 'string') {
                errorMessage = error.message;
              } else if (error?.data && typeof error.data === 'object') {
                const data = error.data as any;
                if (data.error && typeof data.error === 'object' && data.error.message) {
                  errorMessage = data.error.message;
                } else {
                  errorMessage = data.message || JSON.stringify(data);
                }
              } else {
                errorMessage = t('entities:generation.saveFailed');
              }
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
  }, [generatedStory, story, storyId, cutOffChunks, updateStory, dispatch]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    setGeneratedStory(null);
    handleGenerate();
  }, [handleGenerate]);

  // Format complexity label
  const getComplexityLabel = (value: 'simple' | 'moderate' | 'complex') => {
    const labels: Record<string, string> = {
      simple: t('entities:generation.complexitySimple'),
      moderate: t('entities:generation.complexityModerate'),
      complex: t('entities:generation.complexityComplex'),
    };
    return labels[value] || value;
  };

  // Show loading state
  if (isLoading) {
    return (
      <GradientBackground>
        <Animated.View entering={FadeIn.duration(300)} style={styles.loadingContainer}>
          <MainBookActivityIndicator size={80} />
          <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={styles.loadingText}>
            {t('entities:common.loading')}
          </Animated.Text>
        </Animated.View>
      </GradientBackground>
    );
  }

  // Show error if story not found
  if (!story) {
    return (
      <GradientBackground style={styles.container}>
        <EmptyState
          title={t('stories:detail.errorTitle')}
          message={t('stories:detail.errorMessage')}
          icon={<Ionicons name="alert-circle" size={64} color={colors.error} />}
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
        <Text style={styles.title}>{t('entities:generation.title')}</Text>
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
                  {t('entities:generation.apiKeyWarning')}
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
            <Text style={styles.sectionTitle}>{t('entities:generation.previewTitle')}</Text>
            <StatisticsCards statistics={statistics} animated={true} />
            {statistics.characterCount === 0 && statistics.blurbCount === 0 && statistics.sceneCount === 0 && statistics.chapterCount === 0 && (
              <Text style={styles.emptyPreviewText}>
                {t('entities:generation.previewEmpty')}
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
              <Text style={styles.sectionTitle}>{t('entities:generation.optionsTitle')}</Text>

              {/* Complexity Selector */}
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>{t('entities:generation.complexity')}</Text>
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
                    title={t('entities:generation.complexitySimple')}
                  />
                  <Menu.Item
                    onPress={() => {
                      setComplexity('moderate');
                      setComplexityMenuVisible(false);
                    }}
                    title={t('entities:generation.complexityModerate')}
                  />
                  <Menu.Item
                    onPress={() => {
                      setComplexity('complex');
                      setComplexityMenuVisible(false);
                    }}
                    title={t('entities:generation.complexityComplex')}
                  />
                </Menu>
              </View>

              {/* Style Input */}
              <View style={styles.optionRow}>
                <Input
                  label={t('entities:generation.styleLabel')}
                  value={style}
                  onChangeText={setStyle}
                  placeholder={t('entities:generation.stylePlaceholder')}
                  helperText={t('entities:generation.styleHelper')}
                  containerStyle={styles.inputContainer}
                />
              </View>

              {/* Additional Instructions */}
              <View style={styles.optionRow}>
                <Input
                  label={t('entities:generation.instructionsLabel')}
                  value={additionalInstructions}
                  onChangeText={setAdditionalInstructions}
                  placeholder={t('entities:generation.instructionsPlaceholder')}
                  helperText={t('entities:generation.instructionsHelper')}
                  multiline
                  numberOfLines={4}
                  containerStyle={styles.inputContainer}
                />
              </View>

              {/* TTS-Friendly Formatting Option */}
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setTtsFriendly(!ttsFriendly)}
                  activeOpacity={0.7}
                >
                  <Checkbox
                    status={ttsFriendly ? 'checked' : 'unchecked'}
                    onPress={() => setTtsFriendly(!ttsFriendly)}
                    color={colors.primary}
                  />
                  <View style={styles.checkboxLabelContainer}>
                    <Text style={styles.checkboxLabel}>
                      {t('entities:generation.ttsFriendlyLabel')}
                    </Text>
                    <Text style={styles.checkboxHelper}>
                      {t('entities:generation.ttsFriendlyHelper')}
                    </Text>
                  </View>
                </TouchableOpacity>
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
            {isGenerating ? t('entities:generation.generating') : t('entities:generation.generateButton')}
          </PaperButton>
        </Animated.View>
      )}

      {/* Generated Story Result */}
      {generatedStory && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.resultHeader}>
                <Text style={styles.sectionTitle}>{t('entities:generation.resultTitle')}</Text>
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={styles.viewToggle}
                    onPress={() => setUseBookView(!useBookView)}
                  >
                    <Ionicons
                      name={useBookView ? "list" : "book"}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  {!useBookView && (
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
                        title={t('entities:generation.formatFormatted')}
                      />
                      <Menu.Item
                        onPress={() => {
                          setFormatOption('raw');
                          setFormatMenuVisible(false);
                        }}
                        title={t('entities:generation.formatRaw')}
                      />
                    </Menu>
                  )}
                </View>
              </View>

              {/* Story Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="document-text" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{formatWordCount(generatedStory.wordCount, t)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="flash" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>
                    {generatedStory.usage.inputTokens + generatedStory.usage.outputTokens} {t('entities:generation.tokens')}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Story Player - Only shows if TTS is available for story language */}
          <Animated.View entering={FadeInDown.delay(125).duration(400)}>
            <StoryPlayer text={generatedStory.content} title={story.title} />
          </Animated.View>

          <Card style={styles.card}>
            <Card.Content>
              <Divider style={styles.divider} />

              {/* Story Content */}
              {useBookView ? (
                <View style={styles.bookViewContainer}>
                  <BookView
                    content={generatedStory.content}
                    language={language}
                  />
                </View>
              ) : (
                <ScrollView
                  style={[
                    styles.storyContentContainer,
                  ]}
                  contentContainerStyle={
                    isRTL(generatedStory.content) ? styles.storyContentContainerRTLContent : undefined
                  }
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                >
                  <Text
                    style={[
                      styles.storyContent,
                      formatOption === 'raw' && styles.storyContentRaw,
                      isRTL(generatedStory.content) && styles.storyContentRTL,
                    ]}
                    selectable
                  >
                    {generatedStory.content}
                  </Text>
                </ScrollView>
              )}
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
              {t('entities:generation.retry')}
            </PaperButton>
            <PaperButton
              variant="primary"
              onPress={handleSave}
              style={styles.actionButton}
            >
              {t('entities:generation.save')}
            </PaperButton>
          </View>
        </Animated.View>
      )}
      </ScrollView>

      {/* Full Screen Loading Overlay */}
      {(isGenerating || isChunkedGeneration) && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.loadingOverlay}>
          <View style={styles.loadingOverlayContent}>
            <MainBookActivityIndicator size={120} />
            <Text style={styles.generatingText}>
              {isChunkedGeneration && chunkedProgress
                ? t('entities:generation.generatingChunked', { 
                    type: chapters.length > 0 ? t('entities:generation.chunkTypes.chapter') : t('entities:generation.chunkTypes.section'),
                    current: chunkedProgress.currentChunk,
                    total: chunkedProgress.totalChunks
                  })
                : t('entities:generation.generatingOverlay')}
            </Text>
            <Text style={styles.generatingSubtext}>
              {isChunkedGeneration && chunkedProgress
                ? t('entities:generation.generatingChunkedSubtext', {
                    completed: chunkedProgress.completedChunks,
                    total: chunkedProgress.totalChunks,
                    type: chapters.length > 0 ? t('entities:generation.chunkTypes.chapters') : t('entities:generation.chunkTypes.sections')
                  })
                : t('entities:generation.generatingSubtext')}
            </Text>
            {isChunkedGeneration && chunkedProgress && chunkedProgress.error && (
              <Text style={styles.errorText}>
                {typeof chunkedProgress.error === 'string' 
                  ? chunkedProgress.error 
                  : (chunkedProgress.error as any)?.message || String(chunkedProgress.error)}
              </Text>
            )}
          </View>
        </Animated.View>
      )}
      
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed - GradientBackground handles the background
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewToggle: {
    padding: spacing.xs,
  },
  formatSelector: {
    padding: spacing.xs,
  },
  bookViewContainer: {
    height: 900,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  storyContentContainerRTL: {
    direction: 'rtl',
  },
  storyContentContainerRTLContent: {
    alignItems: 'flex-end',
  },
  storyContentRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkboxLabelContainer: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  checkboxLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  checkboxHelper: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
