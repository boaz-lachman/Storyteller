/**
 * Custom hook for ChapterForm logic
 * Handles form state, validation, and submission for creating/editing chapters
 */
import { useState, useEffect } from 'react';
import { isNotEmpty, isValidLength, required, validationMessages, isValidRange } from '../utils/validation';
import type { Chapter } from '../types';

export interface ChapterFormData {
  title: string;
  description: string;
  importance: number; // 1-10
  order?: number; // Optional, will be auto-assigned if not provided
  scenes?: string[]; // Scene IDs - optional for now (not in database schema yet)
}

export interface UseChapterFormProps {
  chapter?: Chapter | null;
  onSubmit: (data: ChapterFormData) => void;
  existingChaptersCount?: number; // For auto-assigning order
}

export interface UseChapterFormReturn {
  // Form state
  title: string;
  description: string;
  importance: number;
  order: number | undefined;
  scenes: string[];
  
  // Setters
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setImportance: (value: number) => void;
  setOrder: (value: number | undefined) => void;
  setScenes: (value: string[]) => void;
  
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
}: UseChapterFormProps): UseChapterFormReturn => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState(5);
  const [order, setOrder] = useState<number | undefined>(undefined);
  const [scenes, setScenes] = useState<string[]>([]);

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with chapter data
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title || '');
      setDescription(chapter.description || '');
      setImportance(chapter.importance || 5);
      setOrder(chapter.order);
      setScenes([]); // Scenes not in schema yet
      setErrors({});
    } else {
      // Reset to defaults for new chapter
      setTitle('');
      setDescription('');
      setImportance(5);
      setOrder(undefined); // Will be auto-assigned
      setScenes([]);
      setErrors({});
    }
  }, [chapter]);

  // Check if form has changes
  const hasChanges = chapter ? (
    title !== (chapter.title || '') ||
    description !== (chapter.description || '') ||
    importance !== (chapter.importance || 5) ||
    order !== chapter.order ||
    scenes.length > 0 // Scenes not in schema, so any selection is a change
  ) : (
    title !== '' ||
    description !== '' ||
    importance !== 5 ||
    order !== undefined ||
    scenes.length > 0
  );

  // Reset form to original chapter values or defaults
  const resetForm = () => {
    if (chapter) {
      setTitle(chapter.title || '');
      setDescription(chapter.description || '');
      setImportance(chapter.importance || 5);
      setOrder(chapter.order);
      setScenes([]);
    } else {
      setTitle('');
      setDescription('');
      setImportance(5);
      setOrder(undefined);
      setScenes([]);
    }
    setErrors({});
  };

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
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        importance,
        order: order !== undefined ? order : undefined, // Will be auto-assigned if undefined
        scenes: scenes.length > 0 ? scenes : undefined,
      });
    }
  };

  return {
    // Form state
    title,
    description,
    importance,
    order,
    scenes,
    
    // Setters
    setTitle,
    setDescription,
    setImportance,
    setOrder,
    setScenes,
    
    // Errors
    errors,
    
    // Actions
    handleSubmit,
    resetForm,
    hasChanges,
  };
};
