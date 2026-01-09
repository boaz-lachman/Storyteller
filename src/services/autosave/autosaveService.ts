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

/**
 * Activity context that can be saved
 */
export interface ActivityContext {
  selectedStoryId?: string;
  currentTab?: string;
  formState?: Record<string, any>;
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
  activityContext: ActivityContext
): Promise<void> {
  try {
    const appState: SavedAppState = {
      navigationState: navigationState || null,
      activityContext: {
        ...activityContext,
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
