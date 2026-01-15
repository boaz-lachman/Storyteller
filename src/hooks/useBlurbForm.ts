/**
 * Custom hook for BlurbForm logic
 * Handles form state, validation, and submission for creating/editing blurbs
 */
import { useState, useEffect, useCallback } from 'react';
import { isNotEmpty, isValidLength, required, validationMessages, isValidRange } from '../utils/validation';
import { useFormAutoSave } from './useFormAutoSave';
import type { IdeaBlurb } from '../types';

export interface BlurbFormData {
  title: string;
  description: string;
  importance: number; // 1-10
  category?: 'plot-point' | 'conflict' | 'theme' | 'setting' | 'other';
}

export interface UseBlurbFormProps {
  blurb?: IdeaBlurb | null;
  onSubmit: (data: BlurbFormData) => void;
  storyId?: string;
}

export interface UseBlurbFormReturn {
  // Form state
  title: string;
  description: string;
  importance: number;
  category: BlurbFormData['category'];
  
  // Setters
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setImportance: (value: number) => void;
  setCategory: (value: BlurbFormData['category']) => void;
  
  // Errors
  errors: Record<string, string>;
  
  // Actions
  handleSubmit: () => void;
  resetForm: () => void;
  hasChanges: boolean;
}

const CATEGORY_OPTIONS: Array<{ label: string; value: BlurbFormData['category'] }> = [
  { label: 'Plot Point', value: 'plot-point' },
  { label: 'Conflict', value: 'conflict' },
  { label: 'Theme', value: 'theme' },
  { label: 'Setting', value: 'setting' },
  { label: 'Other', value: 'other' },
];

/**
 * Custom hook for BlurbForm
 */
export const useBlurbForm = ({
  blurb,
  onSubmit,
  storyId,
}: UseBlurbFormProps): UseBlurbFormReturn => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState(5);
  const [category, setCategory] = useState<BlurbFormData['category']>('other');

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save hook
  const { restoreFormState, clearSavedState, autoSave } = useFormAutoSave({
    formType: 'blurb',
    entityId: blurb?.id,
    storyId,
    debounceMs: 1000,
    enabled: true,
  });

  // Restore form state on mount (only for create mode or if no blurb data)
  useEffect(() => {
    let isMounted = true;
    const restoreState = async () => {
      // Only restore if creating a new blurb (no blurb prop)
      if (!blurb) {
        const savedState = await restoreFormState();
        if (isMounted && savedState?.formData) {
          const data = savedState.formData;
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
          if (data.importance !== undefined) setImportance(data.importance);
          if (data.category) setCategory(data.category);
        }
      }
    };
    restoreState();
    return () => {
      isMounted = false;
    };
  }, [restoreFormState, blurb]); // Only run on mount or when blurb changes

  // Initialize form with blurb data
  useEffect(() => {
    if (blurb) {
      setTitle(blurb.title || '');
      setDescription(blurb.description || '');
      setImportance(blurb.importance || 5);
      setCategory(blurb.category || 'other');
      setErrors({});
    }
  }, [blurb]);

  // Auto-save form data whenever it changes (debounced)
  useEffect(() => {
    const formData: Record<string, any> = {
      title,
      description,
      importance,
      category,
    };
    autoSave(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, importance, category]);

  // Check if form has changes
  const hasChanges = blurb ? (
    title !== (blurb.title || '') ||
    description !== (blurb.description || '') ||
    importance !== (blurb.importance || 5) ||
    category !== (blurb.category || 'other')
  ) : (
    title !== '' ||
    description !== '' ||
    importance !== 5 ||
    category !== 'other'
  );

  // Reset form to original blurb values or defaults
  const resetForm = useCallback(() => {
    if (blurb) {
      setTitle(blurb.title || '');
      setDescription(blurb.description || '');
      setImportance(blurb.importance || 5);
      setCategory(blurb.category || 'other');
    } else {
      setTitle('');
      setDescription('');
      setImportance(5);
      setCategory('other');
    }
    setErrors({});
    clearSavedState();
  }, [blurb, clearSavedState]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!required(title)) {
      newErrors.title = validationMessages.required;
    } else if (!isValidLength(title, 1, 100)) {
      newErrors.title = validationMessages.lengthRange(1, 100);
    }

    if (!required(description)) {
      newErrors.description = validationMessages.required;
    } else if (!isValidLength(description, 1, 1000)) {
      newErrors.description = validationMessages.lengthRange(1, 1000);
    }

    if (!isValidRange(importance, 1, 10)) {
      newErrors.importance = 'Importance must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = () => {
    if (validate()) {
      // Clear saved state on successful submit
      clearSavedState();
      
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        importance,
        category: category || undefined,
      });
    }
  };

  return {
    // Form state
    title,
    description,
    importance,
    category,
    
    // Setters
    setTitle,
    setDescription,
    setImportance,
    setCategory,
    
    // Errors
    errors,
    
    // Actions
    handleSubmit,
    resetForm,
    hasChanges,
  };
};

// Export option constants for use in form component
export const BLURB_FORM_OPTIONS = {
  CATEGORY: CATEGORY_OPTIONS,
};
