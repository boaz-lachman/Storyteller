/**
 * Language Slice
 * Manages the current language/locale preference
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Localization from 'expo-localization';
import { REHYDRATE } from 'redux-persist';
import type { RootState } from '../index';

export type Language = 'en' | 'he';

interface LanguageState {
  language: Language;
  isUserSelected: boolean; // Track if user manually selected language
}

// Get device locale and determine initial language
const getDeviceLanguage = (): Language => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const languageTag = locales[0].languageTag;
      if (languageTag) {
        const langCode = languageTag.split('-')[0].toLowerCase();
        if (langCode === 'he' || langCode === 'iw') {
          return 'he';
        }
      }
    }
  } catch (error) {
    console.warn('Error getting locale from expo-localization:', error);
  }

  // Fallback to Intl API
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const langCode = locale.split('-')[0].toLowerCase();
    if (langCode === 'he' || langCode === 'iw') {
      return 'he';
    }
  } catch (error) {
    console.warn('Error getting locale from Intl:', error);
  }

  // Default to English
  return 'en';
};

// Detect device language for initial state - this runs synchronously before app loads
const deviceLanguage = getDeviceLanguage();

const initialState: LanguageState = {
  language: deviceLanguage,
  isUserSelected: false, // Auto-detected, not user-selected
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      state.isUserSelected = true; // Mark as user-selected when manually changed
    },
  },
  extraReducers: (builder) => {
    // On rehydrate, handle language state restoration
    builder.addCase(REHYDRATE, (state, action: any) => {
      if (action.payload?.language) {
        const persistedState = action.payload.language;
        // If user previously selected a language, use it
        if (persistedState.isUserSelected) {
          return persistedState;
        }
        // If language was auto-detected, re-detect on each launch
        // This ensures device language changes are reflected
        const deviceLanguage = getDeviceLanguage();
        return {
          language: deviceLanguage,
          isUserSelected: false,
        };
      }
      // No persisted state (first launch): use already detected device language
      // The initial state already has the correct device language
      return state;
    });
  },
});

export const { setLanguage } = languageSlice.actions;

export default languageSlice.reducer;

// Selectors
export const selectLanguage = (state: RootState) => state.language.language;
