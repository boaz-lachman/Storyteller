/**
 * Custom hook for ChapterForm logic
 * Handles form state, validation, and submission for creating/editing chapters
 */
import { useState, useEffect, useCallback } from 'react';
import { isNotEmpty, isValidLength, required, validationMessages, isValidRange } from '../utils/validation';
import { useFormAutoSave } from './useFormAutoSave';
import type { Chapter } from '../types';

export interface ChapterFormData {
  title: string;
  description: string;
  importance: number; // 1-10
  order?: number; // Optional, will be auto-assigned if not provided
}

export interface UseChapterFormProps {
  chapter?: Chapter | null;
  onSubmit: (data: ChapterFormData) => void;
  existingChaptersCount?: number; // For auto-assigning order
  storyId?: string;
}

export interface UseChapterFormReturn {
  // Form state
  title: string;
  description: string;
  importance: number;
  order: number | undefined;
  
  // Setters
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setImportance: (value: number) => void;
  setOrder: (value: number | undefined) => void;
  
  // Errors
  errors: Record<string, string>;
  
  // Actions
  handleSubmit: () => void;
  resetForm: () => void;
  hasChanges: boolean;
}

/**
 * Custom hook for ChapterForm
 */
export const useChapterForm = ({
  chapter,
  onSubmit,
  existingChaptersCount = 0,
  storyId,
}: UseChapterFormProps): UseChapterFormReturn => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState(5);
  const [order, setOrder] = useState<number | undefined>(undefined);

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save hook
  const { restoreFormState, clearSavedState, autoSave } = useFormAutoSave({
    formType: 'chapter',
    entityId: chapter?.id,
    storyId,
    debounceMs: 1000,
    enabled: true,
  });

  // Restore form state on mount (only for create mode or if no chapter data)
  useEffect(() => {
    let isMounted = true;
    const restoreState = async () => {
      // Only restore if creating a new chapter (no chapter prop)
      if (!chapter) {
        const savedState = await restoreFormState();
        if (isMounted && savedState?.formData) {
          const data = savedState.formData;
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
          if (data.importance !== undefined) setImportance(data.importance);
          if (data.order !== undefined) setOrder(data.order);
        }
      }
    };
    restoreState();
    return () => {
      isMounted = false;
    };
  }, [restoreFormState, chapter]); // Only run on mount or when chapter changes

  // Initialize form with chapter data
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title || '');
      setDescription(chapter.description || '');
      setImportance(chapter.importance || 5);
      setOrder(chapter.order);
      setErrors({});
    }
  }, [chapter]);

  // Auto-save form data whenever it changes (debounced)
  useEffect(() => {
    const formData: Record<string, any> = {
      title,
      description,
      importance,
      order,
    };
    autoSave(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, importance, order]);

  // Check if form has changes
  const hasChanges = chapter ? (
    title !== (chapter.title || '') ||
    description !== (chapter.description || '') ||
    importance !== (chapter.importance || 5) ||
    order !== chapter.order
  ) : (
    title !== '' ||
    description !== '' ||
    importance !== 5 ||
    order !== undefined
  );

  // Reset form to original chapter values or defaults
  const resetForm = useCallback(() => {
    if (chapter) {
      setTitle(chapter.title || '');
      setDescription(chapter.description || '');
      setImportance(chapter.importance || 5);
      setOrder(chapter.order);
    } else {
      setTitle('');
      setDescription('');
      setImportance(5);
      setOrder(undefined);
    }
    setErrors({});
    clearSavedState();
  }, [chapter, clearSavedState]);

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
    } else if (!isValidLength(description, 1, 2000)) {
      newErrors.description = validationMessages.lengthRange(1, 2000);
    }

    if (!isValidRange(importance, 1, 10)) {
      newErrors.importance = 'Importance must be between 1 and 10';
    }

    if (order !== undefined && (!Number.isInteger(order) || order < 1)) {
      newErrors.order = 'Order must be a positive integer';
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
        order: order !== undefined ? order : undefined, // Will be auto-assigned if undefined
      });
    }
  };

  return {
    // Form state
    title,
    description,
    importance,
    order,
    
    // Setters
    setTitle,
    setDescription,
    setImportance,
    setOrder,
    
    // Errors
    errors,
    
    // Actions
    handleSubmit,
    resetForm,
    hasChanges,
  };
};
