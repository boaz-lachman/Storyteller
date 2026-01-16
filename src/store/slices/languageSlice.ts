/**
 * Language Slice
 * Manages the current language/locale preference
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Localization from 'expo-localization';
import type { RootState } from '../index';

export type Language = 'en' | 'he';

interface LanguageState {
  language: Language;
  isRTL: boolean;
}

// Get device locale and determine initial language
const getInitialLanguage = (): Language => {
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

const initialState: LanguageState = {
  language: getInitialLanguage(),
  isRTL: getInitialLanguage() === 'he',
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
      state.isRTL = action.payload === 'he';
    },
  },
});

export const { setLanguage } = languageSlice.actions;

export default languageSlice.reducer;

// Selectors
export const selectLanguage = (state: RootState) => state.language.language;
export const selectIsRTL = (state: RootState) => state.language.isRTL;
