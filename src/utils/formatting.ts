/**
 * Date and text formatting utilities
 */
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format date to readable string
 * Example: "15/01/2024"
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return format(date, 'dd/MM/yyyy');
};

/**
 * Format date with time
 * Example: "15/01/2024 14:30"
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return format(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Format relative time
 * Example: "2 hours ago", "3 days ago", "less than a minute ago"
 */
export const formatRelativeTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return formatDistanceToNow(date, { addSuffix: true });
};

/**
 * Format text to title case
 * Example: "hello world" -> "Hello World"
 */
export const toTitleCase = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Format story length label
 */
export const formatStoryLength = (
  length: 'short-story' | 'novella' | 'novel'
): string => {
  const labels: Record<string, string> = {
    'short-story': 'Short Story',
    novella: 'Novella',
    novel: 'Novel',
  };
  return labels[length] || length;
};

/**
 * Format story theme label
 */
export const formatStoryTheme = (
  theme:
    | 'horror'
    | 'comedy'
    | 'drama'
    | 'sci-fi'
    | 'fantasy'
    | 'romance'
    | 'thriller'
    | 'mystery'
): string => {
  const labels: Record<string, string> = {
    horror: 'Horror',
    comedy: 'Comedy',
    drama: 'Drama',
    'sci-fi': 'Sci-Fi',
    fantasy: 'Fantasy',
    romance: 'Romance',
    thriller: 'Thriller',
    mystery: 'Mystery',
  };
  return labels[theme] || theme;
};

/**
 * Format character role label
 */
export const formatCharacterRole = (
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
): string => {
  const labels: Record<string, string> = {
    protagonist: 'Protagonist',
    antagonist: 'Antagonist',
    supporting: 'Supporting',
    minor: 'Minor',
  };
  return labels[role] || role;
};

/**
 * Format word count
 * Example: "1,234 words"
 */
export const formatWordCount = (count: number): string => {
  return `${count.toLocaleString()} ${count === 1 ? 'word' : 'words'}`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Remove extra whitespace and normalize
 */
export const normalizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};

/**
 * Format importance value as percentage
 * Example: 7 -> "70%"
 */
export const formatImportance = (value: number): string => {
  const percentage = (value / 10) * 100;
  return `${percentage}%`;
};
