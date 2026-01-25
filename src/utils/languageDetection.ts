/**
 * Language detection utilities
 */

/**
 * Detect if text contains Hebrew characters
 * @param text - Text to analyze
 * @returns True if text contains Hebrew characters
 */
export const isHebrew = (text: string): boolean => {
  if (!text) return false;
  // Hebrew Unicode range: \u0590-\u05FF
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
};

/**
 * Detect if text is primarily RTL (Right-to-Left)
 * Checks for Hebrew, Arabic, and other RTL scripts
 * @param text - Text to analyze
 * @returns True if text is primarily RTL
 */
export const isRTL = (text: string): boolean => {
  if (!text) return false;
  // Hebrew: \u0590-\u05FF
  // Arabic: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF
  // Other RTL scripts can be added here
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return rtlRegex.test(text);
};

/**
 * Get text direction based on content
 * @param text - Text to analyze
 * @returns 'rtl' or 'ltr'
 */
export const getTextDirection = (text: string): 'rtl' | 'ltr' => {
  return isRTL(text) ? 'rtl' : 'ltr';
};

/**
 * Get appropriate font family for the text
 * @param text - Text to analyze
 * @returns Font family string
 */
export const getFontFamily = (text: string): string => {
  if (isHebrew(text)) {
    // Hebrew-compatible fonts
    return "'Arial', 'David', 'Times New Roman', 'Noto Sans Hebrew', sans-serif";
  }
  return "'Georgia', 'Times New Roman', serif";
};
