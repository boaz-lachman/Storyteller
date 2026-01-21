/**
 * EPUB Generator Service
 * Creates EPUB documents from story data
 * EPUB is essentially a ZIP file with a specific structure
 */
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';

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
  const titleHtml = generateTitlePage(story, includeMetadata);
  zip.file('OEBPS/title.xhtml', titleHtml);
  manifestItems.push('<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>');
  spineItems.push('<itemref idref="title"/>');

  // Add description if included
  if (includeDescription && story.description) {
    const descriptionHtml = generateDescriptionPage(story);
    zip.file('OEBPS/description.xhtml', descriptionHtml);
    manifestItems.push('<item id="description" href="description.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="description"/>');
  }

  // Add generated content if included
  if (includeGeneratedContent && story.generatedContent) {
    const contentHtml = generateContentPage(story);
    zip.file('OEBPS/content.xhtml', contentHtml);
    manifestItems.push('<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="content"/>');
  }

  // Add characters if included
  if (includeCharacters && characters.length > 0) {
    const charactersHtml = generateCharactersPage(characters);
    zip.file('OEBPS/characters.xhtml', charactersHtml);
    manifestItems.push('<item id="characters" href="characters.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="characters"/>');
  }

  // Add blurbs if included
  if (includeBlurbs && blurbs.length > 0) {
    const blurbsHtml = generateBlurbsPage(blurbs);
    zip.file('OEBPS/blurbs.xhtml', blurbsHtml);
    manifestItems.push('<item id="blurbs" href="blurbs.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="blurbs"/>');
  }

  // Add CSS
  const css = getEPUBStyles();
  zip.file('OEBPS/style.css', css);
  manifestItems.push('<item id="style" href="style.css" media-type="text/css"/>');

  // 4. Create content.opf (package document)
  const opf = generateOPF(story, manifestItems, spineItems);
  zip.file('OEBPS/content.opf', opf);

  // 5. Create toc.ncx (navigation control file)
  const ncx = generateNCX(story, spineItems);
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
const generateTitlePage = (story: Story, includeMetadata: boolean): string => {
  const metadataHtml = includeMetadata ? `
    <div class="metadata">
      <h2>Story Information</h2>
      <dl>
        <dt>Length:</dt><dd>${escapeXml(formatValue(story.length))}</dd>
        <dt>Theme:</dt><dd>${escapeXml(formatValue(story.theme))}</dd>
        <dt>Tone:</dt><dd>${escapeXml(formatValue(story.tone))}</dd>
        <dt>Point of View:</dt><dd>${escapeXml(formatValue(story.pov))}</dd>
        <dt>Target Audience:</dt><dd>${escapeXml(formatValue(story.targetAudience))}</dd>
        <dt>Status:</dt><dd>${escapeXml(formatValue(story.status))}</dd>
        ${story.setting ? `<dt>Setting:</dt><dd>${escapeXml(story.setting)}</dd>` : ''}
        ${story.timePeriod ? `<dt>Time Period:</dt><dd>${escapeXml(story.timePeriod)}</dd>` : ''}
      </dl>
    </div>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(story.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="title-page">
    <h1>${escapeXml(story.title)}</h1>
    ${metadataHtml}
    <div class="generated-info">Generated on ${escapeXml(new Date().toLocaleString())}</div>
  </div>
</body>
</html>`;
};

/**
 * Generate description page HTML
 */
const generateDescriptionPage = (story: Story): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Description</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>Description</h1>
    <div class="content">${escapeXml(story.description || '').replace(/\n/g, '<br/>')}</div>
  </div>
</body>
</html>`;
};

/**
 * Generate content page HTML
 */
const generateContentPage = (story: Story): string => {
  const content = story.generatedContent || '';
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  const paragraphsHtml = paragraphs.map(p => `<p>${escapeXml(p.trim())}</p>`).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Story Content</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>Story Content</h1>
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
const generateCharactersPage = (characters: Character[]): string => {
  const charactersHtml = characters.map(char => {
    const traitsHtml = char.traits && char.traits.length > 0
      ? `<p><strong>Traits:</strong> ${escapeXml(char.traits.join(', '))}</p>`
      : '';
    const backstoryHtml = char.backstory
      ? `<p><strong>Backstory:</strong> ${escapeXml(char.backstory)}</p>`
      : '';

    return `
    <div class="character">
      <h2>${escapeXml(char.name)} <span class="role">(${escapeXml(formatRole(char.role))})</span></h2>
      <p>${escapeXml(char.description)}</p>
      ${traitsHtml}
      ${backstoryHtml}
    </div>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Characters</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>Characters</h1>
    ${charactersHtml}
  </div>
</body>
</html>`;
};

/**
 * Generate blurbs page HTML
 */
const generateBlurbsPage = (blurbs: IdeaBlurb[]): string => {
  const blurbsHtml = blurbs.map(blurb => {
    const categoryHtml = blurb.category
      ? ` <span class="category">(${escapeXml(formatCategory(blurb.category))})</span>`
      : '';

    return `
    <div class="blurb">
      <h2>${escapeXml(blurb.title)}${categoryHtml}</h2>
      <p>${escapeXml(blurb.description)}</p>
    </div>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Story Ideas & Blurbs</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1>Story Ideas & Blurbs</h1>
    ${blurbsHtml}
  </div>
</body>
</html>`;
};

/**
 * Generate OPF (Open Packaging Format) file
 */
const generateOPF = (story: Story, manifestItems: string[], spineItems: string[]): string => {
  const uuid = `urn:uuid:${generateUUID()}`;
  const date = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${escapeXml(story.title)}</dc:title>
    <dc:language>en</dc:language>
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
const generateNCX = (story: Story, spineItems: string[]): string => {
  const uuid = `urn:uuid:${generateUUID()}`;
  const navPoints: string[] = [];
  
  let playOrder = 1;
  if (spineItems.includes('<itemref idref="title"/>')) {
    navPoints.push(`<navPoint id="title" playOrder="${playOrder++}"><navLabel><text>${escapeXml(story.title)}</text></navLabel><content src="title.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="description"/>')) {
    navPoints.push(`<navPoint id="description" playOrder="${playOrder++}"><navLabel><text>Description</text></navLabel><content src="description.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="content"/>')) {
    navPoints.push(`<navPoint id="content" playOrder="${playOrder++}"><navLabel><text>Story Content</text></navLabel><content src="content.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="characters"/>')) {
    navPoints.push(`<navPoint id="characters" playOrder="${playOrder++}"><navLabel><text>Characters</text></navLabel><content src="characters.xhtml"/></navPoint>`);
  }
  if (spineItems.includes('<itemref idref="blurbs"/>')) {
    navPoints.push(`<navPoint id="blurbs" playOrder="${playOrder++}"><navLabel><text>Story Ideas & Blurbs</text></navLabel><content src="blurbs.xhtml"/></navPoint>`);
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
const getEPUBStyles = (): string => {
  return `body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 1em;
}

h1 {
  font-size: 2em;
  margin-top: 0.67em;
  margin-bottom: 0.67em;
  text-align: center;
}

h2 {
  font-size: 1.5em;
  margin-top: 0.83em;
  margin-bottom: 0.83em;
}

.title-page {
  text-align: center;
  padding: 2em 0;
}

.metadata {
  margin-top: 2em;
  text-align: left;
}

.metadata dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5em 1em;
}

.metadata dt {
  font-weight: bold;
}

.chapter {
  padding: 1em;
}

.content p {
  text-indent: 2em;
  margin-bottom: 1em;
}

.character, .blurb {
  margin-bottom: 2em;
  padding-bottom: 1em;
  border-bottom: 1px solid #ccc;
}

.role, .category {
  font-style: italic;
  font-size: 0.9em;
}

.generated-info {
  margin-top: 2em;
  font-size: 0.9em;
  color: #666;
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
