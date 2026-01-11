/**
 * PDF Generator Service
 * Creates PDF documents from story data using expo-print
 */
import * as Print from 'expo-print';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';

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

  // Build HTML content using formatting functions
  const titleHtml = formatTitle(story.title);
  const metadataHtml = includeMetadata ? formatMetadata(story) : '';
  const contentHtml = formatContentSections(story, {
    includeDescription,
    includeGeneratedContent,
  });
  const charactersHtml = includeCharacters ? formatCharacterList(characters) : '';
  const blurbsHtml = includeBlurbs ? formatBlurbList(blurbs) : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${getPDFStyles()}
      </head>
      <body>
        ${titleHtml}
        ${metadataHtml}
        ${contentHtml}
        ${charactersHtml}
        ${blurbsHtml}
        
        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
  `;

  return generatePDFFromHTML(html);
};

/**
 * Format story title for PDF
 * @param title - Story title
 * @returns Formatted title HTML
 */
const formatTitle = (title: string): string => {
  return `
    <div class="title-section">
      <h1 class="story-title">${escapeHtml(title)}</h1>
    </div>
  `;
};

/**
 * Format story metadata section
 * @param story - Story object
 * @returns Formatted metadata HTML
 */
const formatMetadata = (story: Story): string => {
  const metadataItems = [
    { label: 'Length', value: formatValue(story.length) },
    { label: 'Theme', value: formatValue(story.theme) },
    { label: 'Tone', value: formatValue(story.tone) },
    { label: 'Point of View', value: formatValue(story.pov) },
    { label: 'Target Audience', value: formatValue(story.targetAudience) },
    { label: 'Status', value: formatValue(story.status) },
    ...(story.setting ? [{ label: 'Setting', value: escapeHtml(story.setting) }] : []),
    ...(story.timePeriod ? [{ label: 'Time Period', value: escapeHtml(story.timePeriod) }] : []),
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
    <div class="metadata-section">
      <h2 class="section-title">Story Information</h2>
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
  }
): string => {
  const { includeDescription = true, includeGeneratedContent = true } = options || {};
  let sections = '';

  // Description section
  if (includeDescription && story.description) {
    sections += `
      <div class="content-section">
        <h2 class="section-title">Description</h2>
        <div class="content-text">${escapeHtml(story.description).replace(/\n/g, '<br>')}</div>
      </div>
    `;
  }

  // Generated content section
  if (includeGeneratedContent && story.generatedContent) {
    sections += `
      <div class="content-section">
        <h2 class="section-title">Story Content</h2>
        <div class="story-content">${escapeHtml(story.generatedContent).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
      </div>
    `;
  }

  return sections;
};

/**
 * Format character list
 * @param characters - Array of characters
 * @returns Formatted characters HTML
 */
const formatCharacterList = (characters: Character[]): string => {
  if (!characters || characters.length === 0) {
    return '';
  }

  const charactersHtml = characters
    .map((character) => {
      const roleBadge = formatRoleBadge(character.role);
      const traitsList = character.traits && character.traits.length > 0
        ? `<div class="traits"><strong>Traits:</strong> ${character.traits.map(t => escapeHtml(t)).join(', ')}</div>`
        : '';
      const backstory = character.backstory
        ? `<div class="backstory"><strong>Backstory:</strong> ${escapeHtml(character.backstory).replace(/\n/g, '<br>')}</div>`
        : '';

      return `
        <div class="character-item">
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
    <div class="characters-section">
      <h2 class="section-title">Characters</h2>
      <div class="characters-list">
        ${charactersHtml}
      </div>
    </div>
  `;
};

/**
 * Format blurb list for PDF
 * @param blurbs - Array of blurbs
 * @returns Formatted blurbs HTML
 */
const formatBlurbList = (blurbs: IdeaBlurb[]): string => {
  if (!blurbs || blurbs.length === 0) {
    return '';
  }

  const blurbsHtml = blurbs
    .map((blurb) => {
      const categoryBadge = blurb.category ? formatCategoryBadge(blurb.category) : '';
      
      return `
        <div class="blurb-item">
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
    <div class="blurbs-section">
      <h2 class="section-title">Story Ideas & Blurbs</h2>
      <div class="blurbs-list">
        ${blurbsHtml}
      </div>
    </div>
  `;
};

/**
 * Format category badge
 * @param category - Blurb category
 * @returns Formatted category badge HTML
 */
const formatCategoryBadge = (category: IdeaBlurb['category']): string => {
  if (!category) return '';
  
  const categoryLabels: Record<NonNullable<IdeaBlurb['category']>, string> = {
    'plot-point': 'Plot Point',
    'conflict': 'Conflict',
    'theme': 'Theme',
    'setting': 'Setting',
    'other': 'Other',
  };

  const categoryColors: Record<NonNullable<IdeaBlurb['category']>, string> = {
    'plot-point': '#9b59b6',
    'conflict': '#e67e22',
    'theme': '#16a085',
    'setting': '#3498db',
    'other': '#95a5a6',
  };

  return `
    <span class="category-badge" style="background-color: ${categoryColors[category]};">
      ${escapeHtml(categoryLabels[category])}
    </span>
  `;
};

/**
 * Format role badge
 * @param role - Character role
 * @returns Formatted role badge HTML
 */
const formatRoleBadge = (role: Character['role']): string => {
  const roleColors: Record<Character['role'], string> = {
    protagonist: '#27ae60',
    antagonist: '#e74c3c',
    supporting: '#3498db',
    minor: '#95a5a6',
  };

  const roleLabels: Record<Character['role'], string> = {
    protagonist: 'Protagonist',
    antagonist: 'Antagonist',
    supporting: 'Supporting',
    minor: 'Minor',
  };

  return `
    <span class="role-badge" style="background-color: ${roleColors[role]};">
      ${escapeHtml(roleLabels[role])}
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
 * @returns CSS styles for PDF
 */
const getPDFStyles = (): string => {
  return `
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        padding: 40px;
        line-height: 1.8;
        color: #2c3e50;
        max-width: 900px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      
      /* Title Section */
      .title-section {
        margin-bottom: 40px;
        text-align: center;
        padding-bottom: 30px;
        border-bottom: 4px solid #3498db;
      }
      .story-title {
        color: #2c3e50;
        font-size: 2.5em;
        margin: 0;
        padding: 0;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      
      /* Section Titles */
      .section-title {
        color: #2c3e50;
        font-size: 1.8em;
        margin: 40px 0 20px 0;
        padding-bottom: 10px;
        border-bottom: 2px solid #ecf0f1;
        font-weight: 600;
      }
      
      /* Metadata Section */
      .metadata-section {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 30px;
        border-radius: 10px;
        margin-bottom: 40px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
      }
      .metadata-item {
        display: flex;
        flex-direction: column;
      }
      .metadata-label {
        font-weight: 600;
        color: #555;
        font-size: 0.9em;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .metadata-value {
        color: #2c3e50;
        font-size: 1.1em;
      }
      
      /* Content Sections */
      .content-section {
        margin-bottom: 40px;
      }
      .content-text {
        font-size: 1.1em;
        line-height: 1.9;
        color: #34495e;
        text-align: justify;
      }
      .story-content {
        font-size: 1.05em;
        line-height: 2;
        color: #2c3e50;
        text-align: justify;
        white-space: pre-wrap;
      }
      .story-content p {
        margin-bottom: 15px;
        text-indent: 2em;
      }
      
      /* Characters Section */
      .characters-section {
        margin-bottom: 40px;
      }
      .characters-list {
        display: grid;
        gap: 25px;
      }
      .character-item {
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-left: 4px solid #3498db;
        padding: 25px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }
      .character-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        flex-wrap: wrap;
        gap: 10px;
      }
      .character-name {
        color: #2c3e50;
        font-size: 1.5em;
        margin: 0;
        font-weight: 600;
      }
      .role-badge {
        display: inline-block;
        padding: 5px 15px;
        border-radius: 20px;
        color: white;
        font-size: 0.85em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .character-description {
        font-size: 1.05em;
        line-height: 1.8;
        color: #34495e;
        margin-bottom: 15px;
      }
      .traits {
        font-size: 0.95em;
        color: #555;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #ecf0f1;
      }
      .backstory {
        font-size: 0.95em;
        color: #555;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #ecf0f1;
        line-height: 1.7;
      }
      
      /* Blurbs Section */
      .blurbs-section {
        margin-bottom: 40px;
      }
      .blurbs-list {
        display: flex;
        flex-direction: column;
        gap: 25px;
      }
      .blurb-item {
        background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
        padding: 25px;
        border-radius: 8px;
        border-left: 4px solid #3498db;
        box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        transition: transform 0.2s ease;
      }
      .blurb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 15px;
        flex-wrap: wrap;
        gap: 10px;
      }
      .blurb-title {
        color: #2c3e50;
        font-size: 1.3em;
        margin: 0;
        font-weight: 600;
        flex: 1;
        min-width: 200px;
      }
      .category-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.75em;
        font-weight: 600;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .blurb-description {
        color: #34495e;
        font-size: 1em;
        line-height: 1.7;
        text-align: justify;
      }
      
      /* Footer */
      .footer {
        margin-top: 60px;
        padding-top: 20px;
        border-top: 2px solid #ecf0f1;
        text-align: center;
        color: #7f8c8d;
        font-size: 0.9em;
      }
      
      @media print {
        body {
          padding: 20px;
        }
        .page-break {
          page-break-before: always;
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
