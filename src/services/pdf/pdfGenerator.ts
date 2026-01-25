/**
 * PDF Generator Service
 * Creates PDF documents from story data using expo-print
 */
import * as Print from 'expo-print';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';
import { isRTL, getTextDirection, getFontFamily, isHebrew } from '../../utils/languageDetection';
import {
  getExportTranslations,
  translateRole,
  translateCategory,
  translateTheme,
  translateLength,
  translateTone,
  translatePOV,
  translateTargetAudience,
} from '../../utils/exportTranslations';
import { colors } from '../../constants/colors';

/**
 * Generate a basic PDF from HTML content
 * @param html - HTML content to convert to PDF
 * @param options - Optional print options
 * @returns URI of the generated PDF file
 */
export const generatePDFFromHTML = async (
  html: string,
  options?: Print.PrintOptions
): Promise<string> => {
  try {
    const printOptions: Print.PrintOptions = {
      html,
      ...options,
    };

    const { uri } = await Print.printToFileAsync(printOptions);
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Create a simple test PDF
 * @returns URI of the generated PDF file
 */
export const generateTestPDF = async (): Promise<string> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          p {
            margin-bottom: 15px;
          }
        </style>
      </head>
      <body>
        <h1>Test PDF Document</h1>
        <p>This is a test PDF generated using expo-print.</p>
        <p>If you can see this, the PDF generation is working correctly!</p>
        <p>Generated at: ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `;

  return generatePDFFromHTML(html);
};

/**
 * Generate a formatted PDF from story data with enhanced formatting
 * @param story - Story object to convert to PDF
 * @param options - Optional formatting options
 * @returns URI of the generated PDF file
 */
export const generateStoryPDF = async (
  story: Story,
  options?: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    includeCharacters?: boolean;
    includeBlurbs?: boolean;
    includeMetadata?: boolean;
    includeDescription?: boolean;
    includeGeneratedContent?: boolean;
  }
): Promise<string> => {
  const {
    characters = [],
    blurbs = [],
    includeCharacters = false,
    includeBlurbs = false,
    includeMetadata = true,
    includeDescription = true,
    includeGeneratedContent = true,
  } = options || {};

  // Detect text direction and language based on story title
  const textDirection = getTextDirection(story.title);
  const isRTLText = textDirection === 'rtl';
  const fontFamily = getFontFamily(story.title);
  const language: 'en' | 'he' = isHebrew(story.title) ? 'he' : 'en';
  const t = getExportTranslations(language);

  // Build HTML content using formatting functions
  const titleHtml = formatTitle(story.title, isRTLText);
  const metadataHtml = includeMetadata ? formatMetadata(story, isRTLText, language) : '';
  const contentHtml = formatContentSections(story, {
    includeDescription,
    includeGeneratedContent,
    isRTL: isRTLText,
    language,
  });
  const charactersHtml = includeCharacters ? formatCharacterList(characters, isRTLText, language) : '';
  const blurbsHtml = includeBlurbs ? formatBlurbList(blurbs, isRTLText, language) : '';

  const html = `
    <!DOCTYPE html>
    <html dir="${textDirection}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${getPDFStyles(fontFamily, isRTLText)}
      </head>
      <body>
        ${titleHtml}
        ${metadataHtml}
        ${contentHtml}
        ${charactersHtml}
        ${blurbsHtml}

        <div class="footer">
          ${t.generatedOn} ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
  `;

  return generatePDFFromHTML(html);
};

/**
 * Format story title for PDF
 * @param title - Story title
 * @param isRTL - Whether text is right-to-left
 * @returns Formatted title HTML
 */
const formatTitle = (title: string, isRTL: boolean = false): string => {
  return `
    <div class="title-section" dir="${isRTL ? 'rtl' : 'ltr'}">
      <h1 class="story-title">${escapeHtml(title)}</h1>
    </div>
  `;
};

/**
 * Format story metadata section
 * @param story - Story object
 * @param isRTL - Whether text is right-to-left
 * @param language - Language code for translations
 * @returns Formatted metadata HTML
 */
const formatMetadata = (story: Story, isRTL: boolean = false, language: 'en' | 'he' = 'en'): string => {
  const t = getExportTranslations(language);

  const metadataItems = [
    { label: t.length, value: translateLength(story.length, language) },
    { label: t.theme, value: translateTheme(story.theme, language) },
    { label: t.tone, value: translateTone(story.tone, language) },
    { label: t.pov, value: translatePOV(story.pov, language) },
    { label: t.targetAudience, value: translateTargetAudience(story.targetAudience, language) },
    ...(story.setting ? [{ label: t.setting, value: escapeHtml(story.setting) }] : []),
    ...(story.timePeriod ? [{ label: t.timePeriod, value: escapeHtml(story.timePeriod) }] : []),
  ];

  const itemsHtml = metadataItems
    .map((item) => `
      <div class="metadata-item">
        <span class="metadata-label">${escapeHtml(item.label)}:</span>
        <span class="metadata-value">${item.value}</span>
      </div>
    `)
    .join('');

  return `
    <div class="metadata-section" dir="${isRTL ? 'rtl' : 'ltr'}">
      <h2 class="section-title">${t.storyInformation}</h2>
      <div class="metadata-grid">
        ${itemsHtml}
      </div>
    </div>
  `;
};

/**
 * Format content sections
 * @param story - Story object
 * @param options - Options for what to include
 * @returns Formatted content sections HTML
 */
const formatContentSections = (
  story: Story,
  options?: {
    includeDescription?: boolean;
    includeGeneratedContent?: boolean;
    isRTL?: boolean;
    language?: 'en' | 'he';
  }
): string => {
  const { includeDescription = true, includeGeneratedContent = true, isRTL = false, language = 'en' } = options || {};
  const t = getExportTranslations(language);
  let sections = '';

  // Description section
  if (includeDescription && story.description) {
    const descriptionDir = getTextDirection(story.description);
    sections += `
      <div class="content-section" dir="${descriptionDir}">
        <h2 class="section-title">${t.description}</h2>
        <div class="content-text">${escapeHtml(story.description).replace(/\n/g, '<br>')}</div>
      </div>
    `;
  }

  // Generated content section
  if (includeGeneratedContent && story.generatedContent) {
    const contentDir = getTextDirection(story.generatedContent);
    sections += `
      <div class="content-section" dir="${contentDir}">
        <h2 class="section-title">${t.storyContent}</h2>
        <div class="story-content">${escapeHtml(story.generatedContent).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
      </div>
    `;
  }

  return sections;
};

/**
 * Format character list
 * @param characters - Array of characters
 * @param isRTL - Whether text is right-to-left
 * @param language - Language code for translations
 * @returns Formatted characters HTML
 */
const formatCharacterList = (characters: Character[], isRTL: boolean = false, language: 'en' | 'he' = 'en'): string => {
  if (!characters || characters.length === 0) {
    return '';
  }

  const t = getExportTranslations(language);

  const charactersHtml = characters
    .map((character) => {
      const characterDir = getTextDirection(character.name);
      const roleBadge = formatRoleBadge(character.role, language);
      const traitsList = character.traits && character.traits.length > 0
        ? `<div class="traits"><strong>${t.traits}:</strong> ${character.traits.map(t => escapeHtml(t)).join(', ')}</div>`
        : '';
      const backstory = character.backstory
        ? `<div class="backstory"><strong>${t.backstory}:</strong> ${escapeHtml(character.backstory).replace(/\n/g, '<br>')}</div>`
        : '';

      return `
        <div class="character-item" dir="${characterDir}">
          <div class="character-header">
            <h3 class="character-name">${escapeHtml(character.name)}</h3>
            ${roleBadge}
          </div>
          <div class="character-description">${escapeHtml(character.description).replace(/\n/g, '<br>')}</div>
          ${traitsList}
          ${backstory}
        </div>
      `;
    })
    .join('');

  return `
    <div class="characters-section" dir="${isRTL ? 'rtl' : 'ltr'}">
      <h2 class="section-title">${t.characters}</h2>
      <div class="characters-list">
        ${charactersHtml}
      </div>
    </div>
  `;
};

/**
 * Format blurb list for PDF
 * @param blurbs - Array of blurbs
 * @param isRTL - Whether text is right-to-left
 * @param language - Language code for translations
 * @returns Formatted blurbs HTML
 */
const formatBlurbList = (blurbs: IdeaBlurb[], isRTL: boolean = false, language: 'en' | 'he' = 'en'): string => {
  if (!blurbs || blurbs.length === 0) {
    return '';
  }

  const t = getExportTranslations(language);

  const blurbsHtml = blurbs
    .map((blurb) => {
      const blurbDir = getTextDirection(blurb.title);
      const categoryBadge = blurb.category ? formatCategoryBadge(blurb.category, language) : '';

      return `
        <div class="blurb-item" dir="${blurbDir}">
          <div class="blurb-header">
            <h3 class="blurb-title">${escapeHtml(blurb.title)}</h3>
            ${categoryBadge}
          </div>
          <div class="blurb-description">${escapeHtml(blurb.description).replace(/\n/g, '<br>')}</div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="blurbs-section" dir="${isRTL ? 'rtl' : 'ltr'}">
      <h2 class="section-title">${t.storyIdeas}</h2>
      <div class="blurbs-list">
        ${blurbsHtml}
      </div>
    </div>
  `;
};

/**
 * Format category badge
 * @param category - Blurb category
 * @param language - Language code for translations
 * @returns Formatted category badge HTML
 */
const formatCategoryBadge = (category: IdeaBlurb['category'], language: 'en' | 'he' = 'en'): string => {
  if (!category) return '';

  const categoryColors: Record<NonNullable<IdeaBlurb['category']>, string> = {
    'plot-point': colors.themeDrama,
    'conflict': colors.error,
    'theme': colors.success,
    'setting': colors.info,
    'other': colors.textTertiary,
  };

  const translatedCategory = translateCategory(category, language);

  return `
    <span class="category-badge" style="background-color: ${categoryColors[category]};">
      ${escapeHtml(translatedCategory)}
    </span>
  `;
};

/**
 * Format role badge
 * @param role - Character role
 * @param language - Language code for translations
 * @returns Formatted role badge HTML
 */
const formatRoleBadge = (role: Character['role'], language: 'en' | 'he' = 'en'): string => {
  const roleColors: Record<Character['role'], string> = {
    protagonist: colors.success,
    antagonist: colors.error,
    supporting: colors.info,
    minor: colors.textTertiary,
  };

  const translatedRole = translateRole(role, language);

  return `
    <span class="role-badge" style="background-color: ${roleColors[role]};">
      ${escapeHtml(translatedRole)}
    </span>
  `;
};

/**
 * Format value (capitalize first letter, replace hyphens)
 * @param value - Value to format
 * @returns Formatted value
 */
const formatValue = (value: string): string => {
  if (!value) return '';
  return escapeHtml(value)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get PDF styles
 * @param fontFamily - Font family to use
 * @param isRTL - Whether text is right-to-left
 * @returns CSS styles for PDF
 */
const getPDFStyles = (fontFamily: string, isRTL: boolean = false): string => {
  return `
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        font-family: ${fontFamily};
        padding: 40px;
        line-height: 1.8;
        color: #2c3e50;
        max-width: 900px;
        margin: 0 auto;
        background-color: #ffffff;
      }

      /* Title Section */
      .title-section {
        margin-bottom: 50px;
        text-align: center;
        padding: 40px 20px;
        background: linear-gradient(135deg, ${colors.gradient.peach} 0%, ${colors.gradient.orange} 100%);
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(255, 159, 122, 0.3);
      }
      .story-title {
        color: ${colors.text};
        font-size: 3em;
        margin: 0;
        padding: 0;
        font-weight: 800;
        letter-spacing: -0.5px;
        text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
      }

      /* Section Titles */
      .section-title {
        color: ${colors.text};
        font-size: 2em;
        margin: 50px 0 25px 0;
        padding-bottom: 15px;
        border-bottom: 3px solid ${colors.primary};
        font-weight: 700;
        position: relative;
      }
      .section-title::after {
        content: '';
        position: absolute;
        bottom: -3px;
        ${isRTL ? 'right' : 'left'}: 0;
        width: 80px;
        height: 3px;
        background: ${colors.warning};
      }

      /* Metadata Section */
      .metadata-section {
        background: linear-gradient(135deg, ${colors.surface} 0%, ${colors.accentLight} 100%);
        padding: 35px;
        border-radius: 15px;
        margin-bottom: 50px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        border: 2px solid ${colors.borderLight};
      }
      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }
      .metadata-item {
        display: flex;
        flex-direction: column;
        padding: 15px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        transition: transform 0.2s;
      }
      .metadata-item:hover {
        transform: translateY(-2px);
      }
      .metadata-label {
        font-weight: 700;
        color: ${colors.primary};
        font-size: 0.85em;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .metadata-value {
        color: ${colors.text};
        font-size: 1.15em;
        font-weight: 500;
      }

      /* Content Sections */
      .content-section {
        margin-bottom: 50px;
        padding: 30px;
        background: ${colors.surface};
        border-radius: 12px;
        border-${isRTL ? 'right' : 'left'}: 5px solid ${colors.primary};
      }
      .content-text {
        font-size: 1.15em;
        line-height: 2;
        color: ${colors.textSecondary};
        text-align: justify;
      }
      .story-content {
        font-size: 1.1em;
        line-height: 2.1;
        color: ${colors.text};
        text-align: justify;
        white-space: pre-wrap;
      }
      .story-content p {
        margin-bottom: 20px;
        text-indent: ${isRTL ? '0' : '2em'};
      }

      /* Characters Section */
      .characters-section {
        margin-bottom: 50px;
      }
      .characters-list {
        display: grid;
        gap: 30px;
      }
      .character-item {
        background: linear-gradient(135deg, ${colors.background} 0%, ${colors.surface} 100%);
        border: 2px solid ${colors.borderLight};
        border-${isRTL ? 'right' : 'left'}: 6px solid ${colors.primary};
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .character-item:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(255, 159, 122, 0.15);
      }
      .character-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 15px;
      }
      .character-name {
        color: ${colors.text};
        font-size: 1.7em;
        margin: 0;
        font-weight: 700;
      }
      .role-badge {
        display: inline-block;
        padding: 8px 18px;
        border-radius: 25px;
        color: white;
        font-size: 0.85em;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.15);
      }
      .character-description {
        font-size: 1.1em;
        line-height: 1.9;
        color: ${colors.textSecondary};
        margin-bottom: 20px;
      }
      .traits {
        font-size: 1em;
        color: ${colors.textSecondary};
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px solid ${colors.borderLight};
      }
      .backstory {
        font-size: 1em;
        color: ${colors.textSecondary};
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px solid ${colors.borderLight};
        line-height: 1.8;
      }

      /* Blurbs Section */
      .blurbs-section {
        margin-bottom: 50px;
      }
      .blurbs-list {
        display: flex;
        flex-direction: column;
        gap: 30px;
      }
      .blurb-item {
        background: linear-gradient(135deg, ${colors.background} 0%, ${colors.accentLight} 100%);
        padding: 30px;
        border-radius: 12px;
        border-${isRTL ? 'right' : 'left'}: 6px solid ${colors.warning};
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .blurb-item:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(230, 168, 92, 0.15);
      }
      .blurb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 15px;
      }
      .blurb-title {
        color: ${colors.text};
        font-size: 1.5em;
        margin: 0;
        font-weight: 700;
        flex: 1;
        min-width: 200px;
      }
      .category-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 0.75em;
        font-weight: 700;
        color: white;
        text-transform: uppercase;
        letter-spacing: 1px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.15);
      }
      .blurb-description {
        color: ${colors.textSecondary};
        font-size: 1.05em;
        line-height: 1.9;
        text-align: justify;
      }

      /* Footer */
      .footer {
        margin-top: 80px;
        padding-top: 30px;
        border-top: 3px solid ${colors.borderLight};
        text-align: center;
        color: ${colors.textTertiary};
        font-size: 0.95em;
        font-style: italic;
      }

      /* RTL-specific adjustments */
      [dir="rtl"] .character-item,
      [dir="rtl"] .blurb-item,
      [dir="rtl"] .content-section {
        text-align: right;
      }

      [dir="rtl"] .metadata-item {
        text-align: right;
      }

      @media print {
        body {
          padding: 20px;
        }
        .page-break {
          page-break-before: always;
        }
        .character-item:hover,
        .blurb-item:hover,
        .metadata-item:hover {
          transform: none;
        }
      }
    </style>
  `;
};

/**
 * Escape HTML special characters to prevent XSS
 * @param text - Text to escape
 * @returns Escaped HTML string
 */
const escapeHtml = (text: string | undefined | null): string => {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};
