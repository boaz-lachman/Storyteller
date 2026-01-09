/**
 * Custom hook for EditStoryForm logic
 * Handles form state, validation, and submission for editing existing stories
 */
import { useState, useEffect } from 'react';
import { isNotEmpty, isValidLength, required, validationMessages } from '../utils/validation';
import type { Story } from '../types';

export interface EditStoryFormData {
  title: string;
  description?: string;
  length: 'short-story' | 'novella' | 'novel';
  theme: 'horror' | 'comedy' | 'drama' | 'sci-fi' | 'fantasy' | 'romance' | 'thriller' | 'mystery';
  tone: 'light' | 'dark' | 'neutral' | 'satirical' | 'serious';
  pov: 'first-person' | 'second-person' | 'third-person-limited' | 'third-person-omniscient';
  targetAudience: 'children' | 'young-adult' | 'adult';
  setting?: string;
  timePeriod?: string;
}

export interface UseEditStoryFormProps {
  story: Story | null;
  onSubmit: (data: EditStoryFormData) => void;
}

export interface UseEditStoryFormReturn {
  // Form state
  title: string;
  description: string;
  length: EditStoryFormData['length'];
  theme: EditStoryFormData['theme'];
  tone: EditStoryFormData['tone'];
  pov: EditStoryFormData['pov'];
  targetAudience: EditStoryFormData['targetAudience'];
  setting: string;
  timePeriod: string;
  
  // Setters
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setLength: (value: EditStoryFormData['length']) => void;
  setTheme: (value: EditStoryFormData['theme']) => void;
  setTone: (value: EditStoryFormData['tone']) => void;
  setPov: (value: EditStoryFormData['pov']) => void;
  setTargetAudience: (value: EditStoryFormData['targetAudience']) => void;
  setSetting: (value: string) => void;
  setTimePeriod: (value: string) => void;
  
  // Errors
  errors: Record<string, string>;
  
  // Actions
  handleSubmit: () => void;
  resetForm: () => void;
  hasChanges: boolean;
}

const LENGTH_OPTIONS: Array<{ label: string; value: EditStoryFormData['length'] }> = [
  { label: 'Short Story', value: 'short-story' },
  { label: 'Novella', value: 'novella' },
  { label: 'Novel', value: 'novel' },
];

const THEME_OPTIONS: Array<{ label: string; value: EditStoryFormData['theme'] }> = [
  { label: 'Horror', value: 'horror' },
  { label: 'Comedy', value: 'comedy' },
  { label: 'Drama', value: 'drama' },
  { label: 'Sci-Fi', value: 'sci-fi' },
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Romance', value: 'romance' },
  { label: 'Thriller', value: 'thriller' },
  { label: 'Mystery', value: 'mystery' },
];

const TONE_OPTIONS: Array<{ label: string; value: EditStoryFormData['tone'] }> = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Satirical', value: 'satirical' },
  { label: 'Serious', value: 'serious' },
];

const POV_OPTIONS: Array<{ label: string; value: EditStoryFormData['pov'] }> = [
  { label: 'First Person', value: 'first-person' },
  { label: 'Second Person', value: 'second-person' },
  { label: 'Third Person Limited', value: 'third-person-limited' },
  { label: 'Third Person Omniscient', value: 'third-person-omniscient' },
];

const AUDIENCE_OPTIONS: Array<{ label: string; value: EditStoryFormData['targetAudience'] }> = [
  { label: 'Children', value: 'children' },
  { label: 'Young Adult', value: 'young-adult' },
  { label: 'Adult', value: 'adult' },
];

/**
 * Custom hook for EditStoryForm
 */
export const useEditStoryForm = ({
  story,
  onSubmit,
}: UseEditStoryFormProps): UseEditStoryFormReturn => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState<EditStoryFormData['length']>('short-story');
  const [theme, setTheme] = useState<EditStoryFormData['theme']>('fantasy');
  const [tone, setTone] = useState<EditStoryFormData['tone']>('neutral');
  const [pov, setPov] = useState<EditStoryFormData['pov']>('third-person-limited');
  const [targetAudience, setTargetAudience] = useState<EditStoryFormData['targetAudience']>('adult');
  const [setting, setSetting] = useState('');
  const [timePeriod, setTimePeriod] = useState('');

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with story data
  useEffect(() => {
    if (story) {
      setTitle(story.title || '');
      setDescription(story.description || '');
      setLength(story.length || 'short-story');
      setTheme(story.theme || 'fantasy');
      setTone(story.tone || 'neutral');
      setPov(story.pov || 'third-person-limited');
      setTargetAudience(story.targetAudience || 'adult');
      setSetting(story.setting || '');
      setTimePeriod(story.timePeriod || '');
      setErrors({});
    }
  }, [story]);

  // Check if form has changes
  const hasChanges = story ? (
    title !== (story.title || '') ||
    description !== (story.description || '') ||
    length !== story.length ||
    theme !== story.theme ||
    tone !== story.tone ||
    pov !== story.pov ||
    targetAudience !== story.targetAudience ||
    setting !== (story.setting || '') ||
    timePeriod !== (story.timePeriod || '')
  ) : false;

  // Reset form to original story values
  const resetForm = () => {
    if (story) {
      setTitle(story.title || '');
      setDescription(story.description || '');
      setLength(story.length || 'short-story');
      setTheme(story.theme || 'fantasy');
      setTone(story.tone || 'neutral');
      setPov(story.pov || 'third-person-limited');
      setTargetAudience(story.targetAudience || 'adult');
      setSetting(story.setting || '');
      setTimePeriod(story.timePeriod || '');
      setErrors({});
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!required(title)) {
      newErrors.title = validationMessages.required;
    } else if (!isValidLength(title, 1, 200)) {
      newErrors.title = validationMessages.lengthRange(1, 200);
    }

    if (description && !isValidLength(description, 0, 1000)) {
      newErrors.description = validationMessages.maxLength(1000);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = () => {
    if (validate()) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        length,
        theme,
        tone,
        pov,
        targetAudience,
        setting: setting.trim() || undefined,
        timePeriod: timePeriod.trim() || undefined,
      });
    }
  };

  return {
    // Form state
    title,
    description,
    length,
    theme,
    tone,
    pov,
    targetAudience,
    setting,
    timePeriod,
    
    // Setters
    setTitle,
    setDescription,
    setLength,
    setTheme,
    setTone,
    setPov,
    setTargetAudience,
    setSetting,
    setTimePeriod,
    
    // Errors
    errors,
    
    // Actions
    handleSubmit,
    resetForm,
    hasChanges,
  };
};

// Export option constants for use in form component
export const EDIT_FORM_OPTIONS = {
  LENGTH: LENGTH_OPTIONS,
  THEME: THEME_OPTIONS,
  TONE: TONE_OPTIONS,
  POV: POV_OPTIONS,
  AUDIENCE: AUDIENCE_OPTIONS,
};
