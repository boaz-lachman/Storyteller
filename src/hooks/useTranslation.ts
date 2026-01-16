/**
 * useTranslation Hook
 * Provides translation function and current language
 */
import { useCallback } from 'react';
import { useAppSelector } from './redux';
import { selectLanguage } from '../store/slices/languageSlice';
import { translate } from '../services/translation/translationService';
import type { Language } from '../store/slices/languageSlice';

/**
 * Translation hook
 * Returns translation function and current language
 */
export function useTranslation() {
  const language = useAppSelector(selectLanguage);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return translate(language, key, params);
    },
    [language]
  );

  return {
    t,
    language,
  };
}
