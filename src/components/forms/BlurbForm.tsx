/**
 * Blurb Form Component
 * Form for creating/editing a blurb with all blurb attributes
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { Input } from './Input';
import { PaperButton } from './PaperButton';
import { useBlurbForm, BLURB_FORM_OPTIONS, type BlurbFormData } from '../../hooks/useBlurbForm';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { IdeaBlurb } from '../../types';

export interface BlurbFormProps {
  blurb?: IdeaBlurb | null;
  onSubmit: (data: BlurbFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Blurb Form Component
 */
export const BlurbForm: React.FC<BlurbFormProps> = ({
  blurb,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  // Use custom hook for form logic
  const {
    title,
    description,
    importance,
    category,
    setTitle,
    setDescription,
    setImportance,
    setCategory,
    errors,
    handleSubmit,
    resetForm,
    hasChanges,
  } = useBlurbForm({ blurb, onSubmit });

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
        label="Title"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        required
        placeholder="Enter blurb title"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        required
        placeholder="Enter blurb description"
        multiline
        numberOfLines={6}
        containerStyle={styles.inputContainer}
      />

      <Text style={styles.sectionTitle}>Blurb Attributes</Text>

      {/* Category Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Category</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={category}
            onValueChange={(value) => setCategory(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {BLURB_FORM_OPTIONS.CATEGORY.map((option) => (
              <Picker.Item
                key={option.value || 'none'}
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
          {blurb ? 'Save' : 'Create'}
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
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
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

export default BlurbForm;
