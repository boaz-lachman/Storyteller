/**
 * Translation Service
 * Loads and provides access to translation strings
 */
import type { Language } from '../../store/slices/languageSlice';

// Import translation files
import enAuth from '../../locales/en/auth.json';
import enStories from '../../locales/en/stories.json';
import enEntities from '../../locales/en/entities.json';
import enOnboarding from '../../locales/en/onboarding.json';
import enCommon from '../../locales/en/common.json';

import heAuth from '../../locales/he/auth.json';
import heStories from '../../locales/he/stories.json';
import heEntities from '../../locales/he/entities.json';
import heOnboarding from '../../locales/he/onboarding.json';
import heCommon from '../../locales/he/common.json';

type TranslationNamespace = 'auth' | 'stories' | 'entities' | 'onboarding' | 'common';

type Translations = {
  auth: typeof enAuth;
  stories: typeof enStories;
  entities: typeof enEntities;
  onboarding: typeof enOnboarding;
  common: typeof enCommon;
};

const translations: Record<Language, Translations> = {
  en: {
    auth: enAuth,
    stories: enStories,
    entities: enEntities,
    onboarding: enOnboarding,
    common: enCommon,
  },
  he: {
    auth: heAuth,
    stories: heStories,
    entities: heEntities,
    onboarding: heOnboarding,
    common: heCommon,
  },
};

/**
 * Get translation value by key path
 * Supports nested keys like 'auth:login.title' or 'stories.list.title'
 * 
 * @param language - Current language
 * @param key - Translation key in format 'namespace:key.path' or 'namespace.key.path'
 * @param params - Optional parameters for string interpolation (e.g., {{count}})
 * @returns Translated string or the key if not found
 */
export function translate(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  try {
    // Parse key format: 'namespace:key.path' or 'namespace.key.path'
    // First, find the namespace (everything before the first : or .)
    let namespace: string;
    let keyPath: string;
    
    if (key.includes(':')) {
      const colonIndex = key.indexOf(':');
      namespace = key.substring(0, colonIndex);
      keyPath = key.substring(colonIndex + 1);
    } else if (key.includes('.')) {
      const dotIndex = key.indexOf('.');
      namespace = key.substring(0, dotIndex);
      keyPath = key.substring(dotIndex + 1);
    } else {
      console.warn(`Invalid translation key format: ${key} (must include : or .)`);
      return key;
    }
    
    if (!namespace || !keyPath) {
      console.warn(`Invalid translation key format: ${key}`);
      return key;
    }

    const namespaceKey = namespace as TranslationNamespace;
    const translationObj = translations[language]?.[namespaceKey];

    if (!translationObj) {
      console.warn(`Translation namespace not found: ${namespaceKey}`);
      return key;
    }

    // Split the key path by dots to navigate through nested object
    const keyParts = keyPath.split('.');
    
    // Navigate through nested object
    let value: any = translationObj;
    for (const part of keyParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        console.warn(`Translation key not found: ${key} (failed at: ${part})`);
        return key;
      }
    }

    // If value is a string, apply parameter interpolation
    if (typeof value === 'string' && params) {
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        // Replace {{key}} with value
        const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
        result = result.replace(regex, String(paramValue));
      }
      return result;
    }

    return typeof value === 'string' ? value : key;
  } catch (error) {
    console.error(`Error translating key "${key}":`, error);
    return key;
  }
}

/**
 * Get all translations for a namespace
 */
export function getTranslations(
  language: Language,
  namespace: TranslationNamespace
): Translations[typeof namespace] {
  return translations[language]?.[namespace] || translations.en[namespace];
}
