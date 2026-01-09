/**
 * Chapter Form Component
 * Form for creating/editing a chapter with all chapter attributes
 */
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { Input } from './Input';
import { PaperButton } from './PaperButton';
import { useChapterForm, type ChapterFormData } from '../../hooks/useChapterForm';
import { useGetScenesQuery } from '../../store/api/scenesApi';
import { useGetChaptersQuery } from '../../store/api/chaptersApi';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Chapter } from '../../types';

export interface ChapterFormProps {
  chapter?: Chapter | null;
  storyId: string;
  onSubmit: (data: ChapterFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Chapter Form Component
 */
export const ChapterForm: React.FC<ChapterFormProps> = ({
  chapter,
  storyId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  // Fetch scenes for this story
  const { data: availableScenes = [] } = useGetScenesQuery(
    { storyId, sortBy: 'title', order: 'ASC' },
    { skip: !storyId }
  );

  // Fetch existing chapters to determine next order number
  const { data: existingChapters = [] } = useGetChaptersQuery(
    { storyId, sortBy: 'order', order: 'ASC' },
    { skip: !storyId }
  );

  // Use custom hook for form logic
  const {
    title,
    description,
    importance,
    order,
    scenes,
    setTitle,
    setDescription,
    setImportance,
    setOrder,
    setScenes,
    errors,
    handleSubmit,
    resetForm,
    hasChanges,
  } = useChapterForm({
    chapter,
    onSubmit,
    existingChaptersCount: existingChapters.length,
  });

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  // Handle scene toggle
  const handleSceneToggle = (sceneId: string) => {
    if (scenes.includes(sceneId)) {
      setScenes(scenes.filter((id) => id !== sceneId));
    } else {
      setScenes([...scenes, sceneId]);
    }
  };

  // Calculate next order number if not set
  const nextOrderNumber = existingChapters.length > 0
    ? Math.max(...existingChapters.map((c) => c.order)) + 1
    : 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        required
        placeholder="Enter chapter title"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Summary"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        required
        placeholder="Enter chapter summary/description"
        multiline
        numberOfLines={6}
        containerStyle={styles.inputContainer}
      />

      <Text style={styles.sectionTitle}>Chapter Attributes</Text>

      {/* Order Input */}
      <View style={styles.orderContainer}>
        <Text style={styles.orderLabel}>Chapter Order</Text>
        <View style={styles.orderInputContainer}>
          <Input
            label=""
            value={order !== undefined ? order.toString() : ''}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              setOrder(isNaN(num) ? undefined : num);
            }}
            error={errors.order}
            placeholder={`Auto-assign (${nextOrderNumber})`}
            keyboardType="numeric"
            containerStyle={styles.orderInput}
          />
          <Text style={styles.orderHint}>
            {chapter 
              ? 'Change order to reorder chapters'
              : `Leave empty to auto-assign as Chapter ${nextOrderNumber}, or specify an order to insert at that position (existing chapters will shift)`}
          </Text>
        </View>
      </View>

      {/* Importance Slider */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Importance *</Text>
          <Text style={styles.sliderValue}>{importance}/10</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={importance}
          onValueChange={setImportance}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.borderLight}
          thumbTintColor={colors.primary}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>1</Text>
          <Text style={styles.sliderLabelText}>10</Text>
        </View>
        {errors.importance && (
          <Text style={styles.errorText}>{errors.importance}</Text>
        )}
      </View>

      {/* Scene Selection */}
      <View style={styles.sceneSelectionContainer}>
        <Text style={styles.sceneSelectionLabel}>Scenes (Optional)</Text>
        {availableScenes.length === 0 ? (
          <Text style={styles.noScenesText}>
            No scenes available. Create scenes first.
          </Text>
        ) : (
          <View style={styles.sceneList}>
            {availableScenes.map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={styles.sceneItem}
                onPress={() => handleSceneToggle(scene.id)}
              >
                <Checkbox
                  status={scenes.includes(scene.id) ? 'checked' : 'unchecked'}
                  onPress={() => handleSceneToggle(scene.id)}
                  color={colors.primary}
                />
                <View style={styles.sceneInfo}>
                  <Text style={styles.sceneName}>{scene.title}</Text>
                  {scene.description && (
                    <Text style={styles.sceneDescription} numberOfLines={1}>
                      {scene.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <PaperButton
          variant="outline"
          onPress={handleCancel}
          disabled={isLoading}
          style={[styles.button, styles.cancelButton]}
        >
          Cancel
        </PaperButton>
        <PaperButton
          variant="primary"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || !hasChanges}
          style={[styles.button, styles.submitButton]}
        >
          {chapter ? 'Save' : 'Create'}
        </PaperButton>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  orderContainer: {
    marginBottom: spacing.md,
  },
  orderLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  orderInputContainer: {
    marginBottom: spacing.xs,
  },
  orderInput: {
    marginBottom: 0,
  },
  orderHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  sceneSelectionContainer: {
    marginBottom: spacing.md,
  },
  sceneSelectionLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noScenesText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
    padding: spacing.sm,
  },
  sceneList: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    maxHeight: 200,
  },
  sceneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sceneInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  sceneName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  sceneDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sliderContainer: {
    marginBottom: spacing.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  sliderValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderLabelText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    // Additional styles if needed
  },
  submitButton: {
    // Additional styles if needed
  },
});

export default ChapterForm;
