/**
 * Export Translations Utility
 * Provides Hebrew and English translations for PDF, DOCX, and EPUB exports
 */

export interface ExportTranslations {
  storyInformation: string;
  description: string;
  storyContent: string;
  generatedStory: string;
  characters: string;
  storyIdeas: string;
  scenes: string;
  chapters: string;
  generatedOn: string;
  theme: string;
  length: string;
  tone: string;
  pov: string;
  targetAudience: string;
  setting: string;
  timePeriod: string;
  wordCount: string;
  words: string;
  // Character fields
  role: string;
  traits: string;
  backstory: string;
  importance: string;
  // Blurb fields
  category: string;
  // Scene fields
  mood: string;
  conflictLevel: string;
  sceneCharacters: string;
  // Chapter fields
  chapterNumber: string;
  // Role translations
  protagonist: string;
  antagonist: string;
  supporting: string;
  minor: string;
  // Category translations
  plotPoint: string;
  conflict: string;
  themeCategory: string;
  settingCategory: string;
  other: string;
  // Theme translations
  horror: string;
  comedy: string;
  drama: string;
  sciFi: string;
  fantasy: string;
  romance: string;
  thriller: string;
  mystery: string;
  // Length translations
  shortStory: string;
  novella: string;
  novel: string;
  // Tone translations
  light: string;
  dark: string;
  neutral: string;
  satirical: string;
  serious: string;
  // POV translations
  firstPerson: string;
  secondPerson: string;
  thirdPersonLimited: string;
  thirdPersonOmniscient: string;
  // Target Audience translations
  children: string;
  youngAdult: string;
  adult: string;
}

const englishTranslations: ExportTranslations = {
  storyInformation: 'Story Information',
  description: 'Description',
  storyContent: 'Story Content',
  generatedStory: 'Generated Story',
  characters: 'Characters',
  storyIdeas: 'Story Ideas & Blurbs',
  scenes: 'Scenes',
  chapters: 'Chapters',
  generatedOn: 'Generated on',
  theme: 'Theme',
  length: 'Length',
  tone: 'Tone',
  pov: 'Point of View',
  targetAudience: 'Target Audience',
  setting: 'Setting',
  timePeriod: 'Time Period',
  wordCount: 'Word Count',
  words: 'words',
  // Character fields
  role: 'Role',
  traits: 'Traits',
  backstory: 'Backstory',
  importance: 'Importance',
  // Blurb fields
  category: 'Category',
  // Scene fields
  mood: 'Mood',
  conflictLevel: 'Conflict Level',
  sceneCharacters: 'Characters',
  // Chapter fields
  chapterNumber: 'Chapter',
  // Role translations
  protagonist: 'Protagonist',
  antagonist: 'Antagonist',
  supporting: 'Supporting',
  minor: 'Minor',
  // Category translations
  plotPoint: 'Plot Point',
  conflict: 'Conflict',
  themeCategory: 'Theme',
  settingCategory: 'Setting',
  other: 'Other',
  // Theme translations
  horror: 'Horror',
  comedy: 'Comedy',
  drama: 'Drama',
  sciFi: 'Sci-Fi',
  fantasy: 'Fantasy',
  romance: 'Romance',
  thriller: 'Thriller',
  mystery: 'Mystery',
  // Length translations
  shortStory: 'Short Story',
  novella: 'Novella',
  novel: 'Novel',
  // Tone translations
  light: 'Light',
  dark: 'Dark',
  neutral: 'Neutral',
  satirical: 'Satirical',
  serious: 'Serious',
  // POV translations
  firstPerson: 'First Person',
  secondPerson: 'Second Person',
  thirdPersonLimited: 'Third Person Limited',
  thirdPersonOmniscient: 'Third Person Omniscient',
  // Target Audience translations
  children: 'Children',
  youngAdult: 'Young Adult',
  adult: 'Adult',
};

const hebrewTranslations: ExportTranslations = {
  storyInformation: 'מידע על הסיפור',
  description: 'תיאור',
  storyContent: 'תוכן הסיפור',
  generatedStory: 'סיפור שנוצר',
  characters: 'דמויות',
  storyIdeas: 'רעיונות וסיכומי סיפור',
  scenes: 'סצנות',
  chapters: 'פרקים',
  generatedOn: 'נוצר ב',
  theme: 'נושא',
  length: 'אורך',
  tone: 'טון',
  pov: 'נקודת מבט',
  targetAudience: 'קהל יעד',
  setting: 'תפאורה',
  timePeriod: 'תקופה',
  wordCount: 'מספר מילים',
  words: 'מילים',
  // Character fields
  role: 'תפקיד',
  traits: 'תכונות',
  backstory: 'רקע',
  importance: 'חשיבות',
  // Blurb fields
  category: 'קטגוריה',
  // Scene fields
  mood: 'מצב רוח',
  conflictLevel: 'רמת קונפליקט',
  sceneCharacters: 'דמויות',
  // Chapter fields
  chapterNumber: 'פרק',
  // Role translations
  protagonist: 'גיבור ראשי',
  antagonist: 'אנטגוניסט',
  supporting: 'תומך',
  minor: 'משני',
  // Category translations
  plotPoint: 'נקודת עלילה',
  conflict: 'קונפליקט',
  themeCategory: 'נושא',
  settingCategory: 'תפאורה',
  other: 'אחר',
  // Theme translations
  horror: 'אימה',
  comedy: 'קומדיה',
  drama: 'דרמה',
  sciFi: 'מדע בדיוני',
  fantasy: 'פנטזיה',
  romance: 'רומנטיקה',
  thriller: 'מותחן',
  mystery: 'מסתורין',
  // Length translations
  shortStory: 'סיפור קצר',
  novella: 'נובלה',
  novel: 'רומן',
  // Tone translations
  light: 'קל',
  dark: 'אפל',
  neutral: 'ניטרלי',
  satirical: 'סאטירי',
  serious: 'רציני',
  // POV translations
  firstPerson: 'גוף ראשון',
  secondPerson: 'גוף שני',
  thirdPersonLimited: 'גוף שלישי מוגבל',
  thirdPersonOmniscient: 'גוף שלישי יודע כל',
  // Target Audience translations
  children: 'ילדים',
  youngAdult: 'נוער',
  adult: 'מבוגרים',
};

/**
 * Get export translations based on language
 * @param language - Language code ('en' or 'he')
 * @returns Translation object
 */
export const getExportTranslations = (language: 'en' | 'he' = 'en'): ExportTranslations => {
  return language === 'he' ? hebrewTranslations : englishTranslations;
};

/**
 * Translate a role value
 */
export const translateRole = (
  role: string,
  language: 'en' | 'he' = 'en'
): string => {
  const t = getExportTranslations(language);
  const roleMap: Record<string, keyof ExportTranslations> = {
    'protagonist': 'protagonist',
    'antagonist': 'antagonist',
    'supporting': 'supporting',
    'minor': 'minor',
  };
  return t[roleMap[role]] || role;
};

/**
 * Translate a category value
 */
export const translateCategory = (
  category: string,
  language: 'en' | 'he' = 'en'
): string => {
  const t = getExportTranslations(language);
  const categoryMap: Record<string, keyof ExportTranslations> = {
    'plot-point': 'plotPoint',
    'conflict': 'conflict',
    'theme': 'themeCategory',
    'setting': 'settingCategory',
    'other': 'other',
  };
  return t[categoryMap[category]] || category;
};

/**
 * Translate a theme value
 */
export const translateTheme = (
  theme: string,
  language: 'en' | 'he' = 'en'
): string => {
  const t = getExportTranslations(language);
  const themeMap: Record<string, keyof ExportTranslations> = {
    'horror': 'horror',
    'comedy': 'comedy',
    'drama': 'drama',
    'sci-fi': 'sciFi',
    'fantasy': 'fantasy',
    'romance': 'romance',
    'thriller': 'thriller',
    'mystery': 'mystery',
  };
  return t[themeMap[theme]] || theme;
};

/**
 * Translate a length value
 */
export const translateLength = (
  length: string,
  language: 'en' | 'he' = 'en'
): string => {
  const t = getExportTranslations(language);
  const lengthMap: Record<string, keyof ExportTranslations> = {
    'short-story': 'shortStory',
    'novella': 'novella',
    'novel': 'novel',
  };
  return t[lengthMap[length]] || length;
};

/**
 * Translate a tone value
 */
export const translateTone = (
  tone: string,
  language: 'en' | 'he' = 'en'
): string => {
  const t = getExportTranslations(language);
  const toneMap: Record<string, keyof ExportTranslations> = {
    'light': 'light',
    'dark': 'dark',
    'neutral': 'neutral',
    'satirical': 'satirical',
    'serious': 'serious',
  };
  return t[toneMap[tone]] || tone;
};

/**
 * Translate a POV value
 */
export const translatePOV = (
  pov: string,
  language: 'en' | 'he' = 'en'
): string => {
  const t = getExportTranslations(language);
  const povMap: Record<string, keyof ExportTranslations> = {
    'first-person': 'firstPerson',
    'second-person': 'secondPerson',
    'third-person-limited': 'thirdPersonLimited',
    'third-person-omniscient': 'thirdPersonOmniscient',
  };
  return t[povMap[pov]] || pov;
};

/**
 * Translate a target audience value
 */
export const translateTargetAudience = (
  audience: string,
  language: 'en' | 'he' = 'en'
): string => {
  const t = getExportTranslations(language);
  const audienceMap: Record<string, keyof ExportTranslations> = {
    'children': 'children',
    'young-adult': 'youngAdult',
    'adult': 'adult',
  };
  return t[audienceMap[audience]] || audience;
};
