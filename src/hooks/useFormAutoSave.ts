/**
 * Form auto-save hook
 * Provides debounced auto-save functionality for forms
 * Saves form state to AsyncStorage and Redux
 * Restores form state when form mounts
 */
import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  setActiveForm,
  updateFormData,
  clearFormState,
  selectActiveForm,
  type FormType,
  type ActiveFormState,
} from '../store/slices/autosaveSlice';
import {
  saveFormData,
  loadFormData,
  clearFormData,
  type FormState,
} from '../services/autosave/autosaveService';
import { debounce } from 'lodash';

interface UseFormAutoSaveOptions {
  formType: FormType;
  entityId?: string;
  storyId?: string;
  debounceMs?: number; // Default: 1000ms
  enabled?: boolean; // Default: true
}

interface UseFormAutoSaveReturn {
  restoreFormState: () => Promise<FormState | null>;
  clearSavedState: () => Promise<void>;
  isFormActive: boolean;
  autoSave: (formData: Record<string, any>) => void;
}

/**
 * Hook for form auto-save functionality
 * 
 * @param options - Configuration options for auto-save
 * @returns Functions to restore and clear saved state, and whether form is active
 * 
 * @example
 * ```tsx
 * const { restoreFormState, clearSavedState } = useFormAutoSave({
 *   formType: 'character',
 *   entityId: character?.id,
 *   storyId: storyId,
 * });
 * 
 * // Restore form state on mount
 * useEffect(() => {
 *   restoreFormState().then((savedState) => {
 *     if (savedState) {
 *       // Populate form with saved data
 *       setName(savedState.formData.name || '');
 *       setDescription(savedState.formData.description || '');
 *     }
 *   });
 * }, []);
 * 
 * // Auto-save form data (call this when form data changes)
 * useFormAutoSave({
 *   formType: 'character',
 *   entityId: character?.id,
 *   storyId: storyId,
 * });
 * ```
 */
export function useFormAutoSave(
  options: UseFormAutoSaveOptions
): UseFormAutoSaveReturn {
  const {
    formType,
    entityId,
    storyId,
    debounceMs = 1000,
    enabled = true,
  } = options;

  const dispatch = useAppDispatch();
  const activeForm = useAppSelector(selectActiveForm);
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Check if this form is currently active
  const isFormActive =
    activeForm?.formType === formType &&
    activeForm?.entityId === entityId;

  // Initialize debounced save function
  useEffect(() => {
    if (enabled) {
      debouncedSaveRef.current = debounce(
        async (formData: Record<string, any>) => {
          try {
            // Save to AsyncStorage
            await saveFormData(formType, formData, entityId, storyId);

            // Update Redux state
            dispatch(
              setActiveForm({
                formType,
                entityId,
                formData,
                storyId,
              })
            );
          } catch (error) {
            console.error('Error auto-saving form data:', error);
          }
        },
        debounceMs
      );
    }

    return () => {
      // Cancel pending saves on unmount
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.cancel();
      }
    };
  }, [formType, entityId, storyId, debounceMs, enabled, dispatch]);

  /**
   * Auto-save form data (call this when form data changes)
   * This is a separate function that should be called from the component
   */
  const autoSave = useCallback(
    (formData: Record<string, any>) => {
      if (!enabled) return;

      // Update Redux immediately for UI responsiveness
      if (isFormActive) {
        dispatch(updateFormData(formData));
      } else {
        dispatch(
          setActiveForm({
            formType,
            entityId,
            formData,
            storyId,
          })
        );
      }

      // Debounced save to AsyncStorage
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current(formData);
      }
    },
    [enabled, isFormActive, formType, entityId, storyId, dispatch]
  );

  /**
   * Restore form state from AsyncStorage
   */
  const restoreFormState = useCallback(async (): Promise<FormState | null> => {
    try {
      const savedState = await loadFormData(formType, entityId);
      if (savedState) {
        // Restore to Redux
        dispatch(
          setActiveForm({
            formType: savedState.formType,
            entityId: savedState.entityId,
            formData: savedState.formData,
            storyId: savedState.storyId,
          })
        );
      }
      return savedState;
    } catch (error) {
      console.error('Error restoring form state:', error);
      return null;
    }
  }, [formType, entityId, dispatch]);

  /**
   * Clear saved form state
   */
  const clearSavedState = useCallback(async (): Promise<void> => {
    try {
      await clearFormData(formType, entityId);
      dispatch(clearFormState());
    } catch (error) {
      console.error('Error clearing saved form state:', error);
    }
  }, [formType, entityId, dispatch]);

  // Export autoSave function via a ref so it can be accessed
  // This is a workaround since hooks can't return functions that change
  // The component should use this pattern:
  // const { autoSave } = useFormAutoSave(...);
  // But we'll provide it via a different mechanism
  // For now, we'll return the functions that are stable

  return {
    restoreFormState,
    clearSavedState,
    isFormActive,
    autoSave,
  };
}
