import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

/**
 * Complete theme configuration
 */
export const theme = {
  colors,
  spacing,
  typography,
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
  
  // Story attributes options
  storyLengths: ['short-story', 'novella', 'novel'] as const,
  storyThemes: [
    'horror',
    'comedy',
    'drama',
    'sci-fi',
    'fantasy',
    'romance',
    'thriller',
    'mystery',
  ] as const,
  storyTones: ['light', 'dark', 'neutral', 'satirical', 'serious'] as const,
  storyPOVs: [
    'first-person',
    'second-person',
    'third-person-limited',
    'third-person-omniscient',
  ] as const,
  targetAudiences: ['children', 'young-adult', 'adult'] as const,
  
  // Character roles
  characterRoles: ['protagonist', 'antagonist', 'supporting', 'minor'] as const,
  
  // Blurb categories
  blurbCategories: [
    'plot-point',
    'conflict',
    'theme',
    'setting',
    'other',
  ] as const,
  
  // Importance scale
  importanceMin: 1,
  importanceMax: 10,
} as const;

export type Theme = typeof theme;
