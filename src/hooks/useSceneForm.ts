/**
 * Custom hook for SceneForm logic
 * Handles form state, validation, and submission for creating/editing scenes
 */
import { useState, useEffect, useCallback } from 'react';
import { isNotEmpty, isValidLength, required, validationMessages, isValidRange } from '../utils/validation';
import { useFormAutoSave } from './useFormAutoSave';
import type { Scene } from '../types';

export interface SceneFormData {
  title: string;
  description: string;
  setting: string;
  characters: string[]; // Character IDs
  importance: number; // 1-10
  mood?: string;
  conflictLevel?: number; // 1-10
}

export interface UseSceneFormProps {
  scene?: Scene | null;
  onSubmit: (data: SceneFormData) => void;
  storyId?: string;
}

export interface UseSceneFormReturn {
  // Form state
  title: string;
  description: string;
  setting: string;
  characters: string[];
  importance: number;
  mood: string;
  conflictLevel: number | undefined;
  
  // Setters
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setSetting: (value: string) => void;
  setCharacters: (value: string[]) => void;
  setImportance: (value: number) => void;
  setMood: (value: string) => void;
  setConflictLevel: (value: number | undefined) => void;
  
  // Errors
  errors: Record<string, string>;
  
  // Actions
  handleSubmit: () => void;
  resetForm: () => void;
  hasChanges: boolean;
}

/**
 * Custom hook for SceneForm
 */
export const useSceneForm = ({
  scene,
  onSubmit,
  storyId,
}: UseSceneFormProps): UseSceneFormReturn => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [setting, setSetting] = useState('');
  const [characters, setCharacters] = useState<string[]>([]);
  const [importance, setImportance] = useState(5);
  const [mood, setMood] = useState('');
  const [conflictLevel, setConflictLevel] = useState<number | undefined>(undefined);

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save hook
  const { restoreFormState, clearSavedState, autoSave } = useFormAutoSave({
    formType: 'scene',
    entityId: scene?.id,
    storyId,
    debounceMs: 1000,
    enabled: true,
  });

  // Restore form state on mount (only for create mode or if no scene data)
  useEffect(() => {
    let isMounted = true;
    const restoreState = async () => {
      // Only restore if creating a new scene (no scene prop)
      if (!scene) {
        const savedState = await restoreFormState();
        if (isMounted && savedState?.formData) {
          const data = savedState.formData;
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
          if (data.setting) setSetting(data.setting);
          if (data.characters && Array.isArray(data.characters)) setCharacters(data.characters);
          if (data.importance !== undefined) setImportance(data.importance);
          if (data.mood) setMood(data.mood);
          if (data.conflictLevel !== undefined) setConflictLevel(data.conflictLevel);
        }
      }
    };
    restoreState();
    return () => {
      isMounted = false;
    };
  }, [restoreFormState, scene]); // Only run on mount or when scene changes

  // Initialize form with scene data
  useEffect(() => {
    if (scene) {
      setTitle(scene.title || '');
      setDescription(scene.description || '');
      setSetting(scene.setting || '');
      setCharacters(scene.characters || []);
      setImportance(scene.importance || 5);
      setMood(scene.mood || '');
      setConflictLevel(scene.conflictLevel);
      setErrors({});
    }
  }, [scene]);

  // Auto-save form data whenever it changes (debounced)
  useEffect(() => {
    const formData: Record<string, any> = {
      title,
      description,
      setting,
      characters,
      importance,
      mood,
      conflictLevel,
    };
    autoSave(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, setting, characters, importance, mood, conflictLevel]);

  // Check if form has changes
  const hasChanges = scene ? (
    title !== (scene.title || '') ||
    description !== (scene.description || '') ||
    setting !== (scene.setting || '') ||
    JSON.stringify(characters.sort()) !== JSON.stringify((scene.characters || []).sort()) ||
    importance !== (scene.importance || 5) ||
    mood !== (scene.mood || '') ||
    conflictLevel !== scene.conflictLevel
  ) : (
    title !== '' ||
    description !== '' ||
    setting !== '' ||
    characters.length > 0 ||
    importance !== 5 ||
    mood !== '' ||
    conflictLevel !== undefined
  );

  // Reset form to original scene values or defaults
  const resetForm = useCallback(() => {
    if (scene) {
      setTitle(scene.title || '');
      setDescription(scene.description || '');
      setSetting(scene.setting || '');
      setCharacters(scene.characters || []);
      setImportance(scene.importance || 5);
      setMood(scene.mood || '');
      setConflictLevel(scene.conflictLevel);
    } else {
      setTitle('');
      setDescription('');
      setSetting('');
      setCharacters([]);
      setImportance(5);
      setMood('');
      setConflictLevel(undefined);
    }
    setErrors({});
    clearSavedState();
  }, [scene, clearSavedState]);

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

    if (!required(setting)) {
      newErrors.setting = validationMessages.required;
    } else if (!isValidLength(setting, 1, 100)) {
      newErrors.setting = validationMessages.lengthRange(1, 100);
    }

    if (!isValidRange(importance, 1, 10)) {
      newErrors.importance = 'Importance must be between 1 and 10';
    }

    if (conflictLevel !== undefined && !isValidRange(conflictLevel, 1, 10)) {
      newErrors.conflictLevel = 'Conflict level must be between 1 and 10';
    }

    if (mood && !isValidLength(mood, 1, 50)) {
      newErrors.mood = validationMessages.lengthRange(1, 50);
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
        setting: setting.trim(),
        characters,
        importance,
        mood: mood.trim() || undefined,
        conflictLevel,
      });
    }
  };

  return {
    // Form state
    title,
    description,
    setting,
    characters,
    importance,
    mood,
    conflictLevel,
    
    // Setters
    setTitle,
    setDescription,
    setSetting,
    setCharacters,
    setImportance,
    setMood,
    setConflictLevel,
    
    // Errors
    errors,
    
    // Actions
    handleSubmit,
    resetForm,
    hasChanges,
  };
};
