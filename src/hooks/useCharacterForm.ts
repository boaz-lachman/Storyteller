/**
 * Custom hook for CharacterForm logic
 * Handles form state, validation, and submission for creating/editing characters
 */
import { useState, useEffect, useCallback } from 'react';
import { isNotEmpty, isValidLength, required, validationMessages, isValidRange } from '../utils/validation';
import { useFormAutoSave } from './useFormAutoSave';
import type { Character } from '../types';

export interface CharacterFormData {
  name: string;
  description: string;
  importance: number; // 1-10
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  traits: string[]; // Array of trait strings
  backstory?: string;
}

export interface UseCharacterFormProps {
  character?: Character | null;
  onSubmit: (data: CharacterFormData) => void;
  storyId?: string;
}

export interface UseCharacterFormReturn {
  // Form state
  name: string;
  description: string;
  importance: number;
  role: CharacterFormData['role'];
  traits: string[];
  traitsInput: string; // Comma-separated string for input
  backstory: string;
  
  // Setters
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setImportance: (value: number) => void;
  setRole: (value: CharacterFormData['role']) => void;
  setTraitsInput: (value: string) => void;
  setBackstory: (value: string) => void;
  
  // Errors
  errors: Record<string, string>;
  
  // Actions
  handleSubmit: () => void;
  resetForm: () => void;
  hasChanges: boolean;
}

const ROLE_OPTIONS: Array<{ label: string; value: CharacterFormData['role'] }> = [
  { label: 'Protagonist', value: 'protagonist' },
  { label: 'Antagonist', value: 'antagonist' },
  { label: 'Supporting', value: 'supporting' },
  { label: 'Minor', value: 'minor' },
];

/**
 * Parse traits from comma-separated string
 */
const parseTraits = (input: string): string[] => {
  if (!input.trim()) return [];
  return input
    .split(',')
    .map((trait) => trait.trim())
    .filter((trait) => trait.length > 0);
};

/**
 * Format traits array to comma-separated string
 */
const formatTraits = (traits: string[]): string => {
  return traits.join(', ');
};

/**
 * Custom hook for CharacterForm
 */
export const useCharacterForm = ({
  character,
  onSubmit,
  storyId,
}: UseCharacterFormProps): UseCharacterFormReturn => {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState(5);
  const [role, setRole] = useState<CharacterFormData['role']>('supporting');
  const [traits, setTraits] = useState<string[]>([]);
  const [traitsInput, setTraitsInputState] = useState('');
  const [backstory, setBackstory] = useState('');

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save hook
  const { restoreFormState, clearSavedState, autoSave } = useFormAutoSave({
    formType: 'character',
    entityId: character?.id,
    storyId,
    debounceMs: 1000,
    enabled: true,
  });

  // Restore form state on mount (only for create mode or if no character data)
  useEffect(() => {
    let isMounted = true;
    const restoreState = async () => {
      // Only restore if creating a new character (no character prop)
      if (!character) {
        const savedState = await restoreFormState();
        if (isMounted && savedState?.formData) {
          const data = savedState.formData;
          if (data.name) setName(data.name);
          if (data.description) setDescription(data.description);
          if (data.importance !== undefined) setImportance(data.importance);
          if (data.role) setRole(data.role);
          if (data.traits && Array.isArray(data.traits)) {
            setTraits(data.traits);
            setTraitsInputState(formatTraits(data.traits));
          }
          if (data.backstory) setBackstory(data.backstory);
        }
      }
    };
    restoreState();
    return () => {
      isMounted = false;
    };
  }, [restoreFormState, character]); // Only run on mount or when character changes

  // Update traits array when traitsInput changes
  useEffect(() => {
    const parsedTraits = parseTraits(traitsInput);
    setTraits(parsedTraits);
  }, [traitsInput]);

  // Initialize form with character data
  useEffect(() => {
    if (character) {
      setName(character.name || '');
      setDescription(character.description || '');
      setImportance(character.importance || 5);
      setRole(character.role || 'supporting');
      setTraits(character.traits || []);
      setTraitsInputState(formatTraits(character.traits || []));
      setBackstory(character.backstory || '');
      setErrors({});
    }
  }, [character]);

  // Auto-save form data whenever it changes (debounced)
  useEffect(() => {
    const formData: Record<string, any> = {
      name,
      description,
      importance,
      role,
      traits,
      backstory,
    };
    autoSave(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, importance, role, traits, backstory]);

  // Check if form has changes
  const hasChanges = character ? (
    name !== (character.name || '') ||
    description !== (character.description || '') ||
    importance !== (character.importance || 5) ||
    role !== (character.role || 'supporting') ||
    JSON.stringify(traits) !== JSON.stringify(character.traits || []) ||
    backstory !== (character.backstory || '')
  ) : (
    name !== '' ||
    description !== '' ||
    importance !== 5 ||
    role !== 'supporting' ||
    traits.length > 0 ||
    backstory !== ''
  );

  // Reset form to original character values or defaults
  const resetForm = useCallback(() => {
    if (character) {
      setName(character.name || '');
      setDescription(character.description || '');
      setImportance(character.importance || 5);
      setRole(character.role || 'supporting');
      setTraits(character.traits || []);
      setTraitsInputState(formatTraits(character.traits || []));
      setBackstory(character.backstory || '');
    } else {
      setName('');
      setDescription('');
      setImportance(5);
      setRole('supporting');
      setTraits([]);
      setTraitsInputState('');
      setBackstory('');
    }
    setErrors({});
    clearSavedState();
  }, [character, clearSavedState]);

  // Handle traits input change
  const setTraitsInput = (value: string) => {
    setTraitsInputState(value);
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!required(name)) {
      newErrors.name = validationMessages.required;
    } else if (!isValidLength(name, 1, 100)) {
      newErrors.name = validationMessages.lengthRange(1, 100);
    }

    if (!required(description)) {
      newErrors.description = validationMessages.required;
    } else if (!isValidLength(description, 1, 500)) {
      newErrors.description = validationMessages.lengthRange(1, 500);
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
        name: name.trim(),
        description: description.trim(),
        importance,
        role,
        traits,
        backstory: backstory.trim() || undefined,
      });
    }
  };

  return {
    // Form state
    name,
    description,
    importance,
    role,
    traits,
    traitsInput,
    backstory,
    
    // Setters
    setName,
    setDescription,
    setImportance,
    setRole,
    setTraitsInput,
    setBackstory,
    
    // Errors
    errors,
    
    // Actions
    handleSubmit,
    resetForm,
    hasChanges,
  };
};

// Export option constants for use in form component
export const CHARACTER_FORM_OPTIONS = {
  ROLE: ROLE_OPTIONS,
};
