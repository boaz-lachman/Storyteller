/**
 * Auto-save service
 * Handles saving and restoring navigation state and activity context
 * Saves to AsyncStorage for persistence across app restarts
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationState } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';

const AUTOSAVE_KEY = '@storyteller:autosave';
const NAVIGATION_STATE_KEY = '@storyteller:navigationState';
const FORM_STATE_KEY_PREFIX = '@storyteller:formState:';

/**
 * Form types that can be auto-saved
 */
export type FormType = 'story' | 'character' | 'blurb' | 'scene' | 'chapter';

/**
 * Form state structure
 */
export interface FormState {
  formType: FormType;
  entityId?: string;
  formData: Record<string, any>;
  storyId?: string; // For entity forms (character, blurb, scene, chapter)
}

/**
 * Activity context that can be saved
 */
export interface ActivityContext {
  selectedStoryId?: string;
  currentTab?: string;
  formState?: Record<string, any>; // Legacy - kept for backward compatibility
  activeForm?: FormState; // New form state structure
  lastActiveTimestamp?: number;
}

/**
 * Saved app state
 */
export interface SavedAppState {
  navigationState: NavigationState<RootStackParamList> | null;
  activityContext: ActivityContext;
  savedAt: number;
}

/**
 * Save navigation state to AsyncStorage
 */
export async function saveNavigationState(
  navigationState: NavigationState<RootStackParamList> | undefined
): Promise<void> {
  try {
    if (navigationState) {
      const serialized = JSON.stringify(navigationState);
      await AsyncStorage.setItem(NAVIGATION_STATE_KEY, serialized);
    } else {
      await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
    }
  } catch (error) {
    console.error('Error saving navigation state:', error);
    // Don't throw - auto-save should be non-blocking
  }
}

/**
 * Load navigation state from AsyncStorage
 */
export async function loadNavigationState(): Promise<NavigationState<RootStackParamList> | null> {
  try {
    const serialized = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
    if (serialized) {
      const navigationState = JSON.parse(serialized) as NavigationState<RootStackParamList>;
      return navigationState;
    }
    return null;
  } catch (error) {
    console.error('Error loading navigation state:', error);
    return null;
  }
}

/**
 * Save activity context to AsyncStorage
 */
export async function saveActivityContext(context: ActivityContext): Promise<void> {
  try {
    const contextWithTimestamp = {
      ...context,
      lastActiveTimestamp: Date.now(),
    };
    const serialized = JSON.stringify(contextWithTimestamp);
    await AsyncStorage.setItem('@storyteller:activityContext', serialized);
  } catch (error) {
    console.error('Error saving activity context:', error);
    // Don't throw - auto-save should be non-blocking
  }
}

/**
 * Load activity context from AsyncStorage
 */
export async function loadActivityContext(): Promise<ActivityContext | null> {
  try {
    const serialized = await AsyncStorage.getItem('@storyteller:activityContext');
    if (serialized) {
      const context = JSON.parse(serialized) as ActivityContext;
      return context;
    }
    return null;
  } catch (error) {
    console.error('Error loading activity context:', error);
    return null;
  }
}

/**
 * Save complete app state (navigation + activity context)
 */
export async function saveAppState(
  navigationState: NavigationState<RootStackParamList> | undefined,
  activityContext: ActivityContext,
  activeForm?: FormState | null
): Promise<void> {
  try {
    const appState: SavedAppState = {
      navigationState: navigationState || null,
      activityContext: {
        ...activityContext,
        activeForm: activeForm || activityContext.activeForm,
        lastActiveTimestamp: Date.now(),
      },
      savedAt: Date.now(),
    };

    const serialized = JSON.stringify(appState);
    await AsyncStorage.setItem(AUTOSAVE_KEY, serialized);
  } catch (error) {
    console.error('Error saving app state:', error);
    // Don't throw - auto-save should be non-blocking
  }
}

/**
 * Load complete app state from AsyncStorage
 */
export async function loadAppState(): Promise<SavedAppState | null> {
  try {
    const serialized = await AsyncStorage.getItem(AUTOSAVE_KEY);
    if (serialized) {
      const appState = JSON.parse(serialized) as SavedAppState;
      
      // Check if saved state is too old (e.g., older than 7 days)
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      const now = Date.now();
      if (appState.savedAt && now - appState.savedAt > MAX_AGE) {
        // State is too old, clear it
        await clearAppState();
        return null;
      }

      return appState;
    }
    return null;
  } catch (error) {
    console.error('Error loading app state:', error);
    return null;
  }
}

/**
 * Clear saved app state
 */
export async function clearAppState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      AUTOSAVE_KEY,
      NAVIGATION_STATE_KEY,
      '@storyteller:activityContext',
    ]);
    // Also clear all form data
    await clearAllFormData();
  } catch (error) {
    console.error('Error clearing app state:', error);
  }
}

/**
 * Check if saved state exists
 */
export async function hasSavedState(): Promise<boolean> {
  try {
    const state = await AsyncStorage.getItem(AUTOSAVE_KEY);
    return state !== null;
  } catch (error) {
    console.error('Error checking saved state:', error);
    return false;
  }
}

/**
 * Save form data for a specific entity type
 */
export async function saveFormData(
  formType: FormType,
  formData: Record<string, any>,
  entityId?: string,
  storyId?: string
): Promise<void> {
  try {
    const formState: FormState = {
      formType,
      entityId,
      formData,
      storyId,
    };
    const key = `${FORM_STATE_KEY_PREFIX}${formType}${entityId ? `:${entityId}` : ''}`;
    const serialized = JSON.stringify(formState);
    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`Error saving form data for ${formType}:`, error);
    // Don't throw - auto-save should be non-blocking
  }
}

/**
 * Load form data for a specific entity type
 */
export async function loadFormData(
  formType: FormType,
  entityId?: string
): Promise<FormState | null> {
  try {
    const key = `${FORM_STATE_KEY_PREFIX}${formType}${entityId ? `:${entityId}` : ''}`;
    const serialized = await AsyncStorage.getItem(key);
    if (serialized) {
      const formState = JSON.parse(serialized) as FormState;
      return formState;
    }
    return null;
  } catch (error) {
    console.error(`Error loading form data for ${formType}:`, error);
    return null;
  }
}

/**
 * Clear form data for a specific entity type
 */
export async function clearFormData(formType: FormType, entityId?: string): Promise<void> {
  try {
    const key = `${FORM_STATE_KEY_PREFIX}${formType}${entityId ? `:${entityId}` : ''}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing form data for ${formType}:`, error);
  }
}

/**
 * Clear all form data
 */
export async function clearAllFormData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const formKeys = keys.filter((key) => key.startsWith(FORM_STATE_KEY_PREFIX));
    if (formKeys.length > 0) {
      await AsyncStorage.multiRemove(formKeys);
    }
  } catch (error) {
    console.error('Error clearing all form data:', error);
  }
}
