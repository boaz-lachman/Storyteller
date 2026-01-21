/**
 * Character Form Component
 * Form for creating/editing a character with all character attributes
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { Input } from './Input';
import { PaperButton } from './PaperButton';
import { useCharacterForm, CHARACTER_FORM_OPTIONS, type CharacterFormData } from '../../hooks/useCharacterForm';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Character } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { generateCharacterName } from '../../utils/nameGenerator';

export interface CharacterFormProps {
  character?: Character | null;
  onSubmit: (data: CharacterFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  storyId?: string;
}

/**
 * Character Form Component
 */
export const CharacterForm: React.FC<CharacterFormProps> = ({
  character,
  onSubmit,
  onCancel,
  isLoading = false,
  storyId,
}) => {
  const { t } = useTranslation();
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
  } = useCharacterForm({ character, onSubmit, storyId });

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
      <Text style={styles.sectionTitle}>{t('entities:characters.sections.basicInfo')}</Text>
      
      {/* Name Input with Generator Button */}
      <View style={styles.nameInputContainer}>
        <Input
          label={t('entities:characters.fields.name')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          required
          placeholder={t('entities:characters.fields.namePlaceholder')}
          containerStyle={styles.inputContainer}
        />
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => {
            const generatedName = generateCharacterName();
            setName(generatedName);
          }}
          activeOpacity={0.7}
        >
          <Feather name="shuffle" size={20} color={colors.primary} />
          <Text style={styles.generateButtonText}>
            {t('entities:characters.buttons.generateName') || 'Generate Name'}
          </Text>
        </TouchableOpacity>
      </View>

      <Input
        label={t('entities:characters.fields.description')}
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        required
        placeholder={t('entities:characters.fields.descriptionPlaceholder')}
        multiline
        numberOfLines={4}
        containerStyle={styles.inputContainer}
      />

      <Text style={styles.sectionTitle}>{t('entities:characters.sections.attributes')}</Text>

      {/* Role Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>{t('entities:characters.fields.role')} *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={role}
            onValueChange={(value) => setRole(value)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {CHARACTER_FORM_OPTIONS.ROLE.map((option) => {
              let translatedLabel = option.label;
              // Translate role labels
              switch (option.value) {
                case 'protagonist':
                  translatedLabel = t('entities:common.roles.protagonist');
                  break;
                case 'antagonist':
                  translatedLabel = t('entities:common.roles.antagonist');
                  break;
                case 'supporting':
                  translatedLabel = t('entities:common.roles.supporting');
                  break;
                case 'minor':
                  translatedLabel = t('entities:common.roles.minor');
                  break;
                default:
                  translatedLabel = option.label;
              }
              return (
                <Picker.Item
                  key={option.value}
                  label={translatedLabel}
                  value={option.value}
                />
              );
            })}
          </Picker>
        </View>
      </View>

      {/* Importance Slider */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{t('entities:characters.fields.importance')} *</Text>
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

      <Text style={styles.sectionTitle}>{t('entities:characters.sections.additionalDetails')}</Text>

      {/* Traits Input */}
      <Input
        label={t('entities:characters.fields.traits')}
        value={traitsInput}
        onChangeText={setTraitsInput}
        placeholder={t('entities:characters.fields.traitsPlaceholderExample')}
        helperText={t('entities:characters.fields.traitsHelper')}
        containerStyle={styles.inputContainer}
      />

      {/* Backstory Input */}
      <Input
        label={t('entities:characters.fields.backstory')}
        value={backstory}
        onChangeText={setBackstory}
        placeholder={t('entities:characters.fields.backstoryPlaceholder')}
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
          {t('entities:characters.buttons.cancel')}
        </PaperButton>
        <PaperButton
          variant="primary"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || !hasChanges}
          style={[styles.button, styles.submitButton]}
        >
          {character ? t('entities:characters.buttons.save') : t('entities:characters.buttons.create')}
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
  nameInputContainer: {
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: spacing.xs,
    marginTop: spacing.sm,
  },
  generateButtonText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
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
