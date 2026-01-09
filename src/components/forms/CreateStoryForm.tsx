/**
 * Create Story Form Component
 * Form for creating a new story with all story attributes
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Input } from './Input';
import { PaperButton } from './PaperButton';
import { useCreateStoryForm, FORM_OPTIONS, type CreateStoryFormData } from '../../hooks/useCreateStoryForm';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

// Re-export CreateStoryFormData from hook for backward compatibility
export type { CreateStoryFormData } from '../../hooks/useCreateStoryForm';

export interface CreateStoryFormProps {
  onSubmit: (data: CreateStoryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}


/**
 * Create Story Form Component
 */
export const CreateStoryForm: React.FC<CreateStoryFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  // Use custom hook for form logic
  const {
    title,
    description,
    length,
    theme,
    tone,
    pov,
    targetAudience,
    setting,
    timePeriod,
    setTitle,
    setDescription,
    setLength,
    setTheme,
    setTone,
    setPov,
    setTargetAudience,
    setSetting,
    setTimePeriod,
    errors,
    handleSubmit,
  } = useCreateStoryForm({ onSubmit });

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
        placeholder="Enter story title"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        placeholder="Enter story description (optional)"
        multiline
        numberOfLines={4}
        containerStyle={styles.inputContainer}
      />

      <Text style={styles.sectionTitle}>Story Attributes</Text>

      {/* Length Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Length *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={length}
            onValueChange={(value) => setLength(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {FORM_OPTIONS.LENGTH.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Theme Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Theme *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={theme}
            onValueChange={(value) => setTheme(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {FORM_OPTIONS.THEME.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Tone Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Tone *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={tone}
            onValueChange={(value) => setTone(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {FORM_OPTIONS.TONE.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* POV Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Point of View *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={pov}
            onValueChange={(value) => setPov(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {FORM_OPTIONS.POV.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Target Audience Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Target Audience *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={targetAudience}
            onValueChange={(value) => setTargetAudience(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {FORM_OPTIONS.AUDIENCE.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Additional Details</Text>

      <Input
        label="Setting"
        value={setting}
        onChangeText={setSetting}
        placeholder="Enter story setting (optional)"
        containerStyle={styles.inputContainer}
      />

      <Input
        label="Time Period"
        value={timePeriod}
        onChangeText={setTimePeriod}
        placeholder="Enter time period (optional)"
        containerStyle={styles.inputContainer}
      />

      <View style={styles.buttonContainer}>
        <PaperButton
          variant="outline"
          onPress={onCancel}
          disabled={isLoading}
          style={[styles.button, styles.cancelButton]}
        >
          Cancel
        </PaperButton>
        <PaperButton
          variant="primary"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={[styles.button, styles.submitButton]}
        >
          Create
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
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : 50,
    backgroundColor: colors.surface,
    color: colors.text,
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

export default CreateStoryForm;
