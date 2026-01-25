/**
 * EPUB Generator Service
 * Creates EPUB documents from story data
 * EPUB is essentially a ZIP file with a specific structure
 */
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import type { Story, Character, IdeaBlurb } from '../../types';
import { getTextDirection, getFontFamily, isHebrew } from '../../utils/languageDetection';
import {
  getExportTranslations,
  translateRole,
  translateCategory,
  translateTheme,
  translateLength,
  translateTone,
  translatePOV,
  translateTargetAudience,
  type ExportTranslations,
} from '../../utils/exportTranslations';
import { colors } from '../../constants/colors';

export interface EpubOptions {
  characters?: Character[];
  blurbs?: IdeaBlurb[];
  includeCharacters?: boolean;
  includeBlurbs?: boolean;
  includeMetadata?: boolean;
  includeDescription?: boolean;
  includeGeneratedContent?: boolean;
}

/**
 * Generate an EPUB document from story data
 * @param story - Story object to convert to EPUB
 * @param options - Optional formatting options
 * @returns URI of the generated EPUB file
 */
export const generateStoryEPUB = async (
  story: Story,
  options?: EpubOptions
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

  // Detect text direction, language, and font based on story title
  const textDirection = getTextDirection(story.title);
  const isRTL = textDirection === 'rtl';
  const fontFamily = getFontFamily(story.title);
  const language: 'en' | 'he' = isHebrew(story.title) ? 'he' : 'en';
  const t = getExportTranslations(language);

  const zip = new JSZip();

  // EPUB structure requires:
  // 1. mimetype file (uncompressed)
  // 2. META-INF/container.xml
  // 3. OEBPS/ folder with content files
  // 4. OEBPS/content.opf (package document)
  // 5. OEBPS/toc.ncx (navigation control file)

  // 1. mimetype (must be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. Create META-INF folder and container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // 3. Create OEBPS folder structure
  const manifestItems: string[] = [];
  const spineItems: string[] = [];

  // Add cover/title page
  const titleHtml = generateTitlePage(story, includeMetadata, textDirection, t);
  zip.file('OEBPS/title.xhtml', titleHtml);
  manifestItems.push('<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>');
  spineItems.push('<itemref idref="title"/>');

  // Add description if included
  if (includeDescription && story.description) {
    const descriptionHtml = generateDescriptionPage(story, textDirection, t);
    zip.file('OEBPS/description.xhtml', descriptionHtml);
    manifestItems.push('<item id="description" href="description.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="description"/>');
  }

  // Add generated content if included
  if (includeGeneratedContent && story.generatedContent) {
    const contentHtml = generateContentPage(story, textDirection, t);
    zip.file('OEBPS/content.xhtml', contentHtml);
    manifestItems.push('<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="content"/>');
  }

  // Add characters if included
  if (includeCharacters && characters.length > 0) {
    const charactersHtml = generateCharactersPage(characters, textDirection, language, t);
    zip.file('OEBPS/characters.xhtml', charactersHtml);
    manifestItems.push('<item id="characters" href="characters.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="characters"/>');
  }

  // Add blurbs if included
  if (includeBlurbs && blurbs.length > 0) {
    const blurbsHtml = generateBlurbsPage(blurbs, textDirection, language, t);
    zip.file('OEBPS/blurbs.xhtml', blurbsHtml);
    manifestItems.push('<item id="blurbs" href="blurbs.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="blurbs"/>');
  }

  // Add CSS
  const css = getEPUBStyles(fontFamily, isRTL);
  zip.file('OEBPS/style.css', css);
  manifestItems.push('<item id="style" href="style.css" media-type="text/css"/>');

  // 4. Create content.opf (package document)
  const opf = generateOPF(story, manifestItems, spineItems, language);
  zip.file('OEBPS/content.opf', opf);

  // 5. Create toc.ncx (navigation control file)
  const ncx = generateNCX(story, spineItems, t);
  zip.file('OEBPS/toc.ncx', ncx);
  manifestItems.push('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');

  // Generate the ZIP file
  const zipBlob = await zip.generateAsync({ 
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    // Don't compress mimetype
    mimeType: 'application/epub+zip',
  });

  // Save to file system
  const filename = `story_${Date.now()}.epub`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  
  // Use EncodingType if available, otherwise use string literal
  // SDK 54+ may not have EncodingType enum, so fallback to string
  const encoding = (FileSystem as any).EncodingType?.Base64 ?? 'base64';
  
  await FileSystem.writeAsStringAsync(fileUri, zipBlob, {
    encoding: encoding,
  });

  return fileUri;
};

/**
 * Generate title page HTML
 */
const generateTitlePage = (story: Story, includeMetadata: boolean, textDirection: 'rtl' | 'ltr', t: ExportTranslations): string => {
  const language: 'en' | 'he' = textDirection === 'rtl' ? 'he' : 'en';
  const metadataHtml = includeMetadata ? `
    <div class="metadata">
      <h2>${t.storyInformation}</h2>
      <dl>
        <dt>${t.length}:</dt><dd>${escapeXml(translateLength(story.length, language))}</dd>
        <dt>${t.theme}:</dt><dd>${escapeXml(translateTheme(story.theme, language))}</dd>
        <dt>${t.tone}:</dt><dd>${escapeXml(translateTone(story.tone, language))}</dd>
        <dt>${t.pov}:</dt><dd>${escapeXml(translatePOV(story.pov, language))}</dd>
        <dt>${t.targetAudience}:</dt><dd>${escapeXml(translateTargetAudience(story.targetAudience, language))}</dd>
        ${story.setting ? `<dt>${t.setting}:</dt><dd>${escapeXml(story.setting)}</dd>` : ''}
        ${story.timePeriod ? `<dt>${t.timePeriod}:</dt><dd>${escapeXml(story.timePeriod)}</dd>` : ''}
      </dl>
    </div>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" dir="${textDirection}">
<head>
  <title>${escapeXml(story.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="title-page">
    <h1>${escapeXml(story.title)}</h1>
    ${metadataHtml}
    <div class="generated-info">${t.generatedOn} ${escapeXml(new Date().toLocaleString())}</div>
  </div>
</body>
</html>`;
};

/**
 * Generate description page HTML
 */
const generateDescriptionPage = (story: Story, defaultDir: 'rtl' | 'ltr', t: ExportTranslations): string => {
  const descDir = story.description ? getTextDirection(story.description) : defaultDir;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" dir="${descDir}">
<head>
  <title>${t.description}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>${t.description}</h1>
    <div class="content">${escapeXml(story.description || '').replace(/\n/g, '<br/>')}</div>
  </div>
</body>
</html>`;
};

/**
 * Generate content page HTML
 */
const generateContentPage = (story: Story, defaultDir: 'rtl' | 'ltr', t: ExportTranslations): string => {
  const content = story.generatedContent || '';
  const contentDir = content ? getTextDirection(content) : defaultDir;
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  const paragraphsHtml = paragraphs.map(p => `<p>${escapeXml(p.trim())}</p>`).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" dir="${contentDir}">
<head>
  <title>${t.storyContent}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>${t.storyContent}</h1>
    <div class="content">
    ${paragraphsHtml}
    </div>
  </div>
</body>
</html>`;
};

/**
 * Generate characters page HTML
 */
const generateCharactersPage = (characters: Character[], defaultDir: 'rtl' | 'ltr', language: 'en' | 'he', t: ExportTranslations): string => {
  const charactersHtml = characters.map(char => {
    const charDir = getTextDirection(char.name);
    const traitsHtml = char.traits && char.traits.length > 0
      ? `<p><strong>${t.traits}:</strong> ${escapeXml(char.traits.join(', '))}</p>`
      : '';
    const backstoryHtml = char.backstory
      ? `<p><strong>${t.backstory}:</strong> ${escapeXml(char.backstory)}</p>`
      : '';

    return `
    <div class="character" dir="${charDir}">
      <h2>${escapeXml(char.name)} <span class="role">(${escapeXml(translateRole(char.role, language))})</span></h2>
      <p>${escapeXml(char.description)}</p>
      ${traitsHtml}
      ${backstoryHtml}
    </div>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" dir="${defaultDir}">
<head>
  <title>${t.characters}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>${t.characters}</h1>
    ${charactersHtml}
  </div>
</body>
</html>`;
};

/**
 * Generate blurbs page HTML
 */
const generateBlurbsPage = (blurbs: IdeaBlurb[], defaultDir: 'rtl' | 'ltr', language: 'en' | 'he', t: ExportTranslations): string => {
  const blurbsHtml = blurbs.map(blurb => {
    const blurbDir = getTextDirection(blurb.title);
    const categoryHtml = blurb.category
      ? ` <span class="category">(${escapeXml(translateCategory(blurb.category, language))})</span>`
      : '';

    return `
    <div class="blurb" dir="${blurbDir}">
      <h2>${escapeXml(blurb.title)}${categoryHtml}</h2>
      <p>${escapeXml(blurb.description)}</p>
    </div>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" dir="${defaultDir}">
<head>
  <title>${t.storyIdeas}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>${t.storyIdeas}</h1>
    ${blurbsHtml}
  </div>
</body>
</html>`;
};

/**
 * Generate OPF (Open Packaging Format) file
 */
const generateOPF = (story: Story, manifestItems: string[], spineItems: string[], language: string = 'en'): string => {
  const uuid = `urn:uuid:${generateUUID()}`;
  const date = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${escapeXml(story.title)}</dc:title>
    <dc:language>${language}</dc:language>
    <dc:date>${date}</dc:date>
    ${story.description ? `<dc:description>${escapeXml(story.description)}</dc:description>` : ''}
    <meta property="dcterms:modified">${date}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
};

/**
 * Generate NCX (Navigation Control XML) file
 */
const generateNCX = (story: Story, spineItems: string[], t: ExportTranslations): string => {
  const uuid = `urn:uuid:${generateUUID()}`;
  const navPoints: string[] = [];

  let playOrder = 1;
  if (spineItems.includes('<itemref idref="title"/>')) {
    navPoints.push(`<navPoint id="title" playOrder="${playOrder++}"><navLabel><text>${escapeXml(story.title)}</text></navLabel><content src="title.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="description"/>')) {
    navPoints.push(`<navPoint id="description" playOrder="${playOrder++}"><navLabel><text>${t.description}</text></navLabel><content src="description.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="content"/>')) {
    navPoints.push(`<navPoint id="content" playOrder="${playOrder++}"><navLabel><text>${t.storyContent}</text></navLabel><content src="content.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="characters"/>')) {
    navPoints.push(`<navPoint id="characters" playOrder="${playOrder++}"><navLabel><text>${t.characters}</text></navLabel><content src="characters.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="blurbs"/>')) {
    navPoints.push(`<navPoint id="blurbs" playOrder="${playOrder++}"><navLabel><text>${t.storyIdeas}</text></navLabel><content src="blurbs.xhtml"/></navPoint>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(story.title)}</text>
  </docTitle>
  <navMap>
    ${navPoints.join('\n    ')}
  </navMap>
</ncx>`;
};

/**
 * Get EPUB styles
 */
const getEPUBStyles = (fontFamily: string, isRTL: boolean = false): string => {
  const textIndent = isRTL ? '0' : '2em';
  const borderSide = isRTL ? 'border-right' : 'border-left';

  return `/* Base styles */
body {
  font-family: ${fontFamily};
  line-height: 1.8;
  margin: 1.5em;
  color: ${colors.text};
  background-color: ${colors.background};
}

/* Headings */
h1 {
  font-size: 2.5em;
  margin: 1.5em 0 1em 0;
  text-align: center;
  color: ${colors.text};
  font-weight: 700;
  letter-spacing: -0.5px;
}

h2 {
  font-size: 1.8em;
  margin: 1.2em 0 0.8em 0;
  color: ${colors.textSecondary};
  font-weight: 600;
  ${borderSide}: 4px solid ${colors.primary};
  padding-${isRTL ? 'right' : 'left'}: 0.5em;
}

/* Title page */
.title-page {
  text-align: center;
  padding: 3em 1em;
  background: linear-gradient(135deg, ${colors.surface} 0%, ${colors.accentLight} 100%);
  border-radius: 15px;
  margin-bottom: 2em;
}

.title-page h1 {
  color: ${colors.primary};
  font-size: 3em;
  margin: 0 0 0.5em 0;
  text-shadow: 2px 2px 4px rgba(255, 159, 122, 0.2);
}

/* Metadata section */
.metadata {
  margin-top: 2em;
  padding: 1.5em;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  text-align: ${isRTL ? 'right' : 'left'};
}

.metadata h2 {
  font-size: 1.5em;
  margin: 0 0 1em 0;
  color: ${colors.primary};
  ${borderSide}: none;
  border-bottom: 2px solid ${colors.primary};
  padding-${isRTL ? 'right' : 'left'}: 0;
  padding-bottom: 0.5em;
}

.metadata dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.8em 1.5em;
  margin: 0;
}

.metadata dt {
  font-weight: 700;
  color: ${colors.primary};
  font-size: 0.9em;
}

.metadata dd {
  margin: 0;
  color: ${colors.textSecondary};
}

/* Chapter content */
.chapter {
  padding: 1.5em 1em;
}

.content {
  text-align: justify;
  line-height: 2;
}

.content p {
  text-indent: ${textIndent};
  margin-bottom: 1.2em;
  text-align: justify;
}

/* Characters section */
.character {
  margin-bottom: 2.5em;
  padding: 1.5em;
  background: linear-gradient(135deg, ${colors.background} 0%, ${colors.surface} 100%);
  border-radius: 12px;
  ${borderSide}: 6px solid ${colors.primary};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.character h2 {
  margin-top: 0;
  color: ${colors.text};
  ${borderSide}: none;
  padding-${isRTL ? 'right' : 'left'}: 0;
  border-bottom: 2px solid ${colors.borderLight};
  padding-bottom: 0.5em;
}

.character p {
  margin: 1em 0;
  line-height: 1.8;
  color: ${colors.textSecondary};
}

.role {
  font-style: italic;
  font-size: 0.85em;
  color: ${colors.primary};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Blurbs section */
.blurb {
  margin-bottom: 2.5em;
  padding: 1.5em;
  background: linear-gradient(135deg, ${colors.background} 0%, ${colors.accentLight} 100%);
  border-radius: 12px;
  ${borderSide}: 6px solid ${colors.warning};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.blurb h2 {
  margin-top: 0;
  color: ${colors.text};
  ${borderSide}: none;
  padding-${isRTL ? 'right' : 'left'}: 0;
  border-bottom: 2px solid ${colors.borderLight};
  padding-bottom: 0.5em;
}

.blurb p {
  margin: 1em 0;
  line-height: 1.8;
  color: ${colors.textSecondary};
}

.category {
  font-style: italic;
  font-size: 0.85em;
  color: ${colors.warning};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Generated info footer */
.generated-info {
  margin-top: 3em;
  padding-top: 1.5em;
  border-top: 2px solid ${colors.borderLight};
  text-align: center;
  font-size: 0.9em;
  color: ${colors.textTertiary};
  font-style: italic;
}

/* RTL-specific adjustments */
[dir="rtl"] .character,
[dir="rtl"] .blurb,
[dir="rtl"] .chapter,
[dir="rtl"] .content {
  text-align: right;
}

[dir="rtl"] .metadata {
  text-align: right;
}

[dir="rtl"] .content p {
  text-indent: 0;
}

/* Print styles */
@media print {
  body {
    margin: 0;
    padding: 1em;
  }

  .character,
  .blurb {
    page-break-inside: avoid;
  }
}`;
};

/**
 * Generate UUID v4
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Escape XML special characters
 */
const escapeXml = (text: string | undefined | null): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Format value (capitalize first letter, replace hyphens)
 */
const formatValue = (value: string): string => {
  if (!value) return '';
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format character role
 */
const formatRole = (role: Character['role']): string => {
  const roleLabels: Record<Character['role'], string> = {
    protagonist: 'Protagonist',
    antagonist: 'Antagonist',
    supporting: 'Supporting',
    minor: 'Minor',
  };
  return roleLabels[role] || role;
};

/**
 * Format blurb category
 */
const formatCategory = (category: IdeaBlurb['category']): string => {
  if (!category) return '';
  const categoryLabels: Record<NonNullable<IdeaBlurb['category']>, string> = {
    'plot-point': 'Plot Point',
    'conflict': 'Conflict',
    'theme': 'Theme',
    'setting': 'Setting',
    'other': 'Other',
  };
  return categoryLabels[category] || category;
};
