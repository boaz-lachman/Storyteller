/**
 * Scene Form Component
 * Form for creating/editing a scene with all scene attributes
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { Input } from './Input';
import { PaperButton } from './PaperButton';
import { useSceneForm, type SceneFormData } from '../../hooks/useSceneForm';
import { useGetCharactersQuery } from '../../store/api/charactersApi';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Scene } from '../../types';

export interface SceneFormProps {
  scene?: Scene | null;
  storyId: string;
  onSubmit: (data: SceneFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Scene Form Component
 */
export const SceneForm: React.FC<SceneFormProps> = ({
  scene,
  storyId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  // Fetch characters for this story
  const { data: availableCharacters = [] } = useGetCharactersQuery(
    { storyId, sortBy: 'name', order: 'ASC' },
    { skip: !storyId }
  );

  // Use custom hook for form logic
  const {
    title,
    description,
    setting,
    characters,
    importance,
    mood,
    conflictLevel,
    setTitle,
    setDescription,
    setSetting,
    setCharacters,
    setImportance,
    setMood,
    setConflictLevel,
    errors,
    handleSubmit,
    resetForm,
    hasChanges,
  } = useSceneForm({ scene, onSubmit });

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  // Handle character toggle
  const handleCharacterToggle = (characterId: string) => {
    if (characters.includes(characterId)) {
      setCharacters(characters.filter((id) => id !== characterId));
    } else {
      setCharacters([...characters, characterId]);
    }
  };

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
        placeholder="Enter scene title"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        required
        placeholder="Enter scene description"
        multiline
        numberOfLines={6}
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Setting"
        value={setting}
        onChangeText={setSetting}
        error={errors.setting}
        required
        placeholder="Enter scene setting"
        containerStyle={styles.inputContainer}
      />

      <Text style={styles.sectionTitle}>Scene Attributes</Text>

      {/* Character Selection */}
      <View style={styles.characterSelectionContainer}>
        <Text style={styles.characterSelectionLabel}>Characters</Text>
        {availableCharacters.length === 0 ? (
          <Text style={styles.noCharactersText}>
            No characters available. Create characters first.
          </Text>
        ) : (
          <View style={styles.characterList}>
            {availableCharacters.map((character) => (
              <TouchableOpacity
                key={character.id}
                style={styles.characterItem}
                onPress={() => handleCharacterToggle(character.id)}
              >
                <Checkbox
                  status={characters.includes(character.id) ? 'checked' : 'unchecked'}
                  onPress={() => handleCharacterToggle(character.id)}
                  color={colors.primary}
                />
                <Text style={styles.characterName}>{character.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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

      {/* Conflict Level Slider */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Conflict Level</Text>
          <Text style={styles.sliderValue}>
            {conflictLevel !== undefined ? `${conflictLevel}/10` : 'Not set'}
          </Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={conflictLevel !== undefined ? conflictLevel : 5}
          onValueChange={(value) => setConflictLevel(value)}
          minimumTrackTintColor={colors.warning}
          maximumTrackTintColor={colors.borderLight}
          thumbTintColor={colors.warning}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>1</Text>
          <Text style={styles.sliderLabelText}>10</Text>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setConflictLevel(undefined)}
        >
          <Text style={styles.clearButtonText}>Clear conflict level</Text>
        </TouchableOpacity>
        {errors.conflictLevel && (
          <Text style={styles.errorText}>{errors.conflictLevel}</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Additional Details</Text>

      {/* Mood Input */}
      <Input
        label="Mood"
        value={mood}
        onChangeText={setMood}
        error={errors.mood}
        placeholder="Enter scene mood (e.g., tense, peaceful, mysterious)"
        multiline
        numberOfLines={2}
        containerStyle={styles.inputContainer}
      />

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
          {scene ? 'Save' : 'Create'}
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
  characterSelectionContainer: {
    marginBottom: spacing.md,
  },
  characterSelectionLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noCharactersText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
    padding: spacing.sm,
  },
  characterList: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    maxHeight: 200,
  },
  characterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  characterName: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
    marginLeft: spacing.sm,
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
  clearButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  clearButtonText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
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

export default SceneForm;
