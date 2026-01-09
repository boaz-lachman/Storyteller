/**
 * Custom hook for CreateStoryForm logic
 * Handles form state, validation, and submission
 */
import { useState } from 'react';
import { isNotEmpty, isValidLength, required, validationMessages } from '../utils/validation';

export interface CreateStoryFormData {
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

export interface UseCreateStoryFormProps {
  onSubmit: (data: CreateStoryFormData) => void;
}

export interface UseCreateStoryFormReturn {
  // Form state
  title: string;
  description: string;
  length: CreateStoryFormData['length'];
  theme: CreateStoryFormData['theme'];
  tone: CreateStoryFormData['tone'];
  pov: CreateStoryFormData['pov'];
  targetAudience: CreateStoryFormData['targetAudience'];
  setting: string;
  timePeriod: string;
  
  // Setters
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setLength: (value: CreateStoryFormData['length']) => void;
  setTheme: (value: CreateStoryFormData['theme']) => void;
  setTone: (value: CreateStoryFormData['tone']) => void;
  setPov: (value: CreateStoryFormData['pov']) => void;
  setTargetAudience: (value: CreateStoryFormData['targetAudience']) => void;
  setSetting: (value: string) => void;
  setTimePeriod: (value: string) => void;
  
  
  // Errors
  errors: Record<string, string>;
  
  // Actions
  handleSubmit: () => void;
}

const LENGTH_OPTIONS: Array<{ label: string; value: CreateStoryFormData['length'] }> = [
  { label: 'Short Story', value: 'short-story' },
  { label: 'Novella', value: 'novella' },
  { label: 'Novel', value: 'novel' },
];

const THEME_OPTIONS: Array<{ label: string; value: CreateStoryFormData['theme'] }> = [
  { label: 'Horror', value: 'horror' },
  { label: 'Comedy', value: 'comedy' },
  { label: 'Drama', value: 'drama' },
  { label: 'Sci-Fi', value: 'sci-fi' },
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Romance', value: 'romance' },
  { label: 'Thriller', value: 'thriller' },
  { label: 'Mystery', value: 'mystery' },
];

const TONE_OPTIONS: Array<{ label: string; value: CreateStoryFormData['tone'] }> = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Satirical', value: 'satirical' },
  { label: 'Serious', value: 'serious' },
];

const POV_OPTIONS: Array<{ label: string; value: CreateStoryFormData['pov'] }> = [
  { label: 'First Person', value: 'first-person' },
  { label: 'Second Person', value: 'second-person' },
  { label: 'Third Person Limited', value: 'third-person-limited' },
  { label: 'Third Person Omniscient', value: 'third-person-omniscient' },
];

const AUDIENCE_OPTIONS: Array<{ label: string; value: CreateStoryFormData['targetAudience'] }> = [
  { label: 'Children', value: 'children' },
  { label: 'Young Adult', value: 'young-adult' },
  { label: 'Adult', value: 'adult' },
];

/**
 * Custom hook for CreateStoryForm
 */
export const useCreateStoryForm = ({
  onSubmit,
}: UseCreateStoryFormProps): UseCreateStoryFormReturn => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState<CreateStoryFormData['length']>('short-story');
  const [theme, setTheme] = useState<CreateStoryFormData['theme']>('fantasy');
  const [tone, setTone] = useState<CreateStoryFormData['tone']>('neutral');
  const [pov, setPov] = useState<CreateStoryFormData['pov']>('third-person-limited');
  const [targetAudience, setTargetAudience] = useState<CreateStoryFormData['targetAudience']>('adult');
  const [setting, setSetting] = useState('');
  const [timePeriod, setTimePeriod] = useState('');

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});


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
  };
};

// Export option constants for use in form component
export const FORM_OPTIONS = {
  LENGTH: LENGTH_OPTIONS,
  THEME: THEME_OPTIONS,
  TONE: TONE_OPTIONS,
  POV: POV_OPTIONS,
  AUDIENCE: AUDIENCE_OPTIONS,
};
