/**
 * Edit Story Form Component
 * Form for editing an existing story with all story attributes
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Input } from './Input';
import { PaperButton } from './PaperButton';
import { useEditStoryForm, EDIT_FORM_OPTIONS, type EditStoryFormData } from '../../hooks/useEditStoryForm';
import { colors } from '../../constants/colors';
import { spacing, KEYBOARD_BOTTOM_PADDING } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Story } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useMemo } from 'react';
import { formatStoryLength, formatStoryTheme, formatStoryTone, formatStoryPOV, formatStoryTargetAudience } from '../../utils/formatting';

export interface EditStoryFormProps {
  story: Story | null;
  onSubmit: (data: EditStoryFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Edit Story Form Component
 */
export const EditStoryForm: React.FC<EditStoryFormProps> = ({
  story,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  
  // Translate picker options
  const translatedOptions = useMemo(() => ({
    LENGTH: EDIT_FORM_OPTIONS.LENGTH.map(opt => ({
      ...opt,
      label: formatStoryLength(opt.value, t),
    })),
    THEME: EDIT_FORM_OPTIONS.THEME.map(opt => ({
      ...opt,
      label: formatStoryTheme(opt.value, t),
    })),
    TONE: EDIT_FORM_OPTIONS.TONE.map(opt => ({
      ...opt,
      label: formatStoryTone(opt.value, t),
    })),
    POV: EDIT_FORM_OPTIONS.POV.map(opt => ({
      ...opt,
      label: formatStoryPOV(opt.value, t),
    })),
    AUDIENCE: EDIT_FORM_OPTIONS.AUDIENCE.map(opt => ({
      ...opt,
      label: formatStoryTargetAudience(opt.value, t),
    })),
  }), [t]);
  
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
    resetForm,
    hasChanges,
  } = useEditStoryForm({ story, onSubmit });

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
      <Text style={styles.sectionTitle}>{t('stories:edit.sectionBasic')}</Text>
      
      <Input
        label={t('stories:edit.fields.title')}
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        required
        placeholder={t('stories:edit.fields.titlePlaceholder')}
        containerStyle={styles.inputContainer}
      />

      <Input
        label={t('stories:edit.fields.description')}
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        placeholder={t('stories:edit.fields.descriptionPlaceholder')}
        multiline
        numberOfLines={4}
        containerStyle={styles.inputContainer}
      />

      <Text style={styles.sectionTitle}>{t('stories:edit.sectionAttributes')}</Text>

      {/* Length Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>{t('stories:edit.fields.length')} *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={length}
            onValueChange={(value) => setLength(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {translatedOptions.LENGTH.map((option) => (
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
        <Text style={styles.pickerLabel}>{t('stories:edit.fields.theme')} *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={theme}
            onValueChange={(value) => setTheme(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {translatedOptions.THEME.map((option) => (
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
        <Text style={styles.pickerLabel}>{t('stories:edit.fields.tone')} *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={tone}
            onValueChange={(value) => setTone(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {translatedOptions.TONE.map((option) => (
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
        <Text style={styles.pickerLabel}>{t('stories:edit.fields.pov')} *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={pov}
            onValueChange={(value) => setPov(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {translatedOptions.POV.map((option) => (
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
        <Text style={styles.pickerLabel}>{t('stories:edit.fields.targetAudience')} *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={targetAudience}
            onValueChange={(value) => setTargetAudience(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {translatedOptions.AUDIENCE.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('stories:edit.sectionAdditional')}</Text>

      <Input
        label={t('stories:edit.fields.setting')}
        value={setting}
        onChangeText={setSetting}
        placeholder={t('stories:edit.fields.settingPlaceholder')}
        containerStyle={styles.inputContainer}
      />

      <Input
        label={t('stories:edit.fields.timePeriod')}
        value={timePeriod}
        onChangeText={setTimePeriod}
        placeholder={t('stories:edit.fields.timePeriodPlaceholder')}
        containerStyle={styles.inputContainer}
      />

      <View style={styles.buttonContainer}>
        <PaperButton
          variant="outline"
          onPress={handleCancel}
          disabled={isLoading}
          style={[styles.button, styles.cancelButton]}
        >
          {t('stories:edit.buttons.cancel')}
        </PaperButton>
        <PaperButton
          variant="primary"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || !hasChanges}
          style={[styles.button, styles.submitButton]}
        >
          {t('stories:edit.buttons.save')}
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
    paddingBottom: spacing.xxl + KEYBOARD_BOTTOM_PADDING,
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

export default EditStoryForm;
