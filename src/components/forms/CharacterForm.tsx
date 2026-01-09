/**
 * Character Form Component
 * Form for creating/editing a character with all character attributes
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { Input } from './Input';
import { PaperButton } from './PaperButton';
import { useCharacterForm, CHARACTER_FORM_OPTIONS, type CharacterFormData } from '../../hooks/useCharacterForm';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Character } from '../../types';

export interface CharacterFormProps {
  character?: Character | null;
  onSubmit: (data: CharacterFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Character Form Component
 */
export const CharacterForm: React.FC<CharacterFormProps> = ({
  character,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  // Use custom hook for form logic
  const {
    name,
    description,
    importance,
    role,
    traitsInput,
    backstory,
    setName,
    setDescription,
    setImportance,
    setRole,
    setTraitsInput,
    setBackstory,
    errors,
    handleSubmit,
    resetForm,
    hasChanges,
  } = useCharacterForm({ character, onSubmit });

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        required
        placeholder="Enter character name"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        required
        placeholder="Enter character description"
        multiline
        numberOfLines={4}
        containerStyle={styles.inputContainer}
      />

      <Text style={styles.sectionTitle}>Character Attributes</Text>

      {/* Role Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Role *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={role}
            onValueChange={(value) => setRole(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {CHARACTER_FORM_OPTIONS.ROLE.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
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

      <Text style={styles.sectionTitle}>Additional Details</Text>

      {/* Traits Input */}
      <Input
        label="Traits"
        value={traitsInput}
        onChangeText={setTraitsInput}
        placeholder="Enter traits separated by commas (e.g., brave, intelligent, kind)"
        helperText="Separate multiple traits with commas"
        containerStyle={styles.inputContainer}
      />

      {/* Backstory Input */}
      <Input
        label="Backstory"
        value={backstory}
        onChangeText={setBackstory}
        placeholder="Enter character backstory (optional)"
        multiline
        numberOfLines={4}
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
          {character ? 'Save' : 'Create'}
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
  pickerContainer: {
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    minWidth: 200,
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : 60,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  sliderContainer: {
    marginBottom: spacing.lg,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  sliderValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
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
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
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

export default CharacterForm;
