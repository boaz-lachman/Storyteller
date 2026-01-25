/**
 * Export Service
 * Handles exporting stories in various formats using expo-sharing
 */
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { generateStoryPDF } from './pdfGenerator';
import { generateStoryDOCX } from '../docx/docxGenerator';
import { generateStoryEPUB } from '../epub/epubGenerator';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';

export type ExportFormat = 'pdf' | 'docx' | 'epub';

export type ExportType = 'full' | 'elements-only' | 'generated-only';

export interface ExportOptions {
  format?: ExportFormat;
  type?: ExportType;
  includeCharacters?: boolean;
  includeBlurbs?: boolean;
  includeScenes?: boolean;
  includeChapters?: boolean;
}

/**
 * Generate filename for exported story
 * @param story - Story object
 * @param format - Export format
 * @param type - Export type
 * @returns Formatted filename
 */
const generateFilename = (
  story: Story,
  format: ExportFormat = 'pdf',
  type: ExportType = 'full'
): string => {
  // Sanitize the story title for use as a filename
  // Remove only filesystem-invalid characters: / \ : * ? " < > |
  // This preserves Hebrew, English, and other Unicode characters
  const sanitizedTitle = story.title
    .replace(/[/\\:*?"<>|]/g, '') // Remove filesystem-invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .replace(/\s/g, '_'); // Replace spaces with underscores

  return `${sanitizedTitle}.${format}`;
};

/**
 * Export story as PDF
 * @param story - Story to export
 * @param entities - Story entities (characters, blurbs, scenes, chapters)
 * @param options - Export options
 * @returns URI of the exported file
 */
const exportStoryAsPDF = async (
  story: Story,
  entities: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  },
  options: ExportOptions
): Promise<string> => {
  const {
    type = 'full',
  } = options;

  // Determine what to include based on export type
  const charactersToInclude = entities.characters;
  const blurbsToInclude = entities.blurbs;
  
  let includeMetadata = false;
  let includeDescription = false;
  let includeGeneratedContent = false;
  let includeCharacters = false;
  let includeBlurbs = false;

  switch (type) {
    case 'full':
      // Full export: include everything
      includeMetadata = true;
      includeDescription = true;
      includeGeneratedContent = !!story.generatedContent && story.generatedContent.trim().length > 0;
      includeCharacters = !!charactersToInclude && charactersToInclude.length > 0;
      includeBlurbs = !!blurbsToInclude && blurbsToInclude.length > 0;
      break;
    case 'elements-only':
      // Elements only: include characters and blurbs
      includeMetadata = false;
      includeDescription = false;
      includeGeneratedContent = false;
      includeCharacters = !!charactersToInclude && charactersToInclude.length > 0;
      includeBlurbs = !!blurbsToInclude && blurbsToInclude.length > 0;
      break;
    case 'generated-only':
      // Generated content only: include only the generated story
      includeMetadata = false;
      includeDescription = false;
      includeGeneratedContent = !!story.generatedContent && story.generatedContent.trim().length > 0;
      includeCharacters = false;
      includeBlurbs = false;
      break;
  }

  // Generate PDF with appropriate options
  const pdfUri = await generateStoryPDF(story, {
    characters: charactersToInclude,
    blurbs: blurbsToInclude,
    includeCharacters,
    includeBlurbs,
    includeMetadata,
    includeDescription,
    includeGeneratedContent,
  });

  // Rename the PDF file to the story title
  const filename = generateFilename(story, 'pdf', type);
  // Extract directory from the original URI
  const lastSlashIndex = pdfUri.lastIndexOf('/');
  const directory = lastSlashIndex !== -1 ? pdfUri.substring(0, lastSlashIndex + 1) : '';
  const newUri = `${directory}${filename}`;

  try {
    // Move/rename the file to the new location with the story title
    await FileSystem.moveAsync({
      from: pdfUri,
      to: newUri,
    });
    return newUri;
  } catch (error) {
    console.error('Error renaming PDF file:', error);
    // If renaming fails, return the original URI
    console.warn('Failed to rename PDF file, using original URI');
    return pdfUri;
  }
};

/**
 * Export story as DOCX
 * @param story - Story to export
 * @param entities - Story entities (characters, blurbs, scenes, chapters)
 * @param options - Export options
 * @returns URI of the exported file
 */
const exportStoryAsDOCX = async (
  story: Story,
  entities: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  },
  options: ExportOptions
): Promise<string> => {
  const {
    type = 'full',
  } = options;

  // Determine what to include based on export type
  const charactersToInclude = entities.characters;
  const blurbsToInclude = entities.blurbs;
  
  let includeMetadata = false;
  let includeDescription = false;
  let includeGeneratedContent = false;
  let includeCharacters = false;
  let includeBlurbs = false;

  switch (type) {
    case 'full':
      includeMetadata = true;
      includeDescription = true;
      includeGeneratedContent = !!story.generatedContent && story.generatedContent.trim().length > 0;
      includeCharacters = !!charactersToInclude && charactersToInclude.length > 0;
      includeBlurbs = !!blurbsToInclude && blurbsToInclude.length > 0;
      break;
    case 'elements-only':
      includeMetadata = false;
      includeDescription = false;
      includeGeneratedContent = false;
      includeCharacters = !!charactersToInclude && charactersToInclude.length > 0;
      includeBlurbs = !!blurbsToInclude && blurbsToInclude.length > 0;
      break;
    case 'generated-only':
      includeMetadata = false;
      includeDescription = false;
      includeGeneratedContent = !!story.generatedContent && story.generatedContent.trim().length > 0;
      includeCharacters = false;
      includeBlurbs = false;
      break;
  }

  // Generate DOCX with appropriate options
  const docxUri = await generateStoryDOCX(story, {
    characters: charactersToInclude,
    blurbs: blurbsToInclude,
    includeCharacters,
    includeBlurbs,
    includeMetadata,
    includeDescription,
    includeGeneratedContent,
  });

  // Rename the DOCX file to the story title
  const filename = generateFilename(story, 'docx', type);
  const lastSlashIndex = docxUri.lastIndexOf('/');
  const directory = lastSlashIndex !== -1 ? docxUri.substring(0, lastSlashIndex + 1) : '';
  const newUri = `${directory}${filename}`;

  try {
    await FileSystem.moveAsync({
      from: docxUri,
      to: newUri,
    });
    return newUri;
  } catch (error) {
    console.error('Error renaming DOCX file:', error);
    console.warn('Failed to rename DOCX file, using original URI');
    return docxUri;
  }
};

/**
 * Export story as EPUB
 * @param story - Story to export
 * @param entities - Story entities (characters, blurbs, scenes, chapters)
 * @param options - Export options
 * @returns URI of the exported file
 */
const exportStoryAsEPUB = async (
  story: Story,
  entities: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  },
  options: ExportOptions
): Promise<string> => {
  const {
    type = 'full',
  } = options;

  // Determine what to include based on export type
  const charactersToInclude = entities.characters;
  const blurbsToInclude = entities.blurbs;
  
  let includeMetadata = false;
  let includeDescription = false;
  let includeGeneratedContent = false;
  let includeCharacters = false;
  let includeBlurbs = false;

  switch (type) {
    case 'full':
      includeMetadata = true;
      includeDescription = true;
      includeGeneratedContent = !!story.generatedContent && story.generatedContent.trim().length > 0;
      includeCharacters = !!charactersToInclude && charactersToInclude.length > 0;
      includeBlurbs = !!blurbsToInclude && blurbsToInclude.length > 0;
      break;
    case 'elements-only':
      includeMetadata = false;
      includeDescription = false;
      includeGeneratedContent = false;
      includeCharacters = !!charactersToInclude && charactersToInclude.length > 0;
      includeBlurbs = !!blurbsToInclude && blurbsToInclude.length > 0;
      break;
    case 'generated-only':
      includeMetadata = false;
      includeDescription = false;
      includeGeneratedContent = !!story.generatedContent && story.generatedContent.trim().length > 0;
      includeCharacters = false;
      includeBlurbs = false;
      break;
  }

  // Generate EPUB with appropriate options
  const epubUri = await generateStoryEPUB(story, {
    characters: charactersToInclude,
    blurbs: blurbsToInclude,
    includeCharacters,
    includeBlurbs,
    includeMetadata,
    includeDescription,
    includeGeneratedContent,
  });

  // Rename the EPUB file to the story title
  const filename = generateFilename(story, 'epub', type);
  const lastSlashIndex = epubUri.lastIndexOf('/');
  const directory = lastSlashIndex !== -1 ? epubUri.substring(0, lastSlashIndex + 1) : '';
  const newUri = `${directory}${filename}`;

  try {
    await FileSystem.moveAsync({
      from: epubUri,
      to: newUri,
    });
    return newUri;
  } catch (error) {
    console.error('Error renaming EPUB file:', error);
    console.warn('Failed to rename EPUB file, using original URI');
    return epubUri;
  }
};

/**
 * Export story with specified options
 * @param story - Story to export
 * @param entities - Story entities
 * @param options - Export options
 * @returns URI of the exported file
 */
export const exportStory = async (
  story: Story,
  entities: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  },
  options: ExportOptions = {}
): Promise<string> => {
  const { format = 'pdf', type = 'full' } = options;

  let fileUri: string;

  switch (format) {
    case 'pdf':
      fileUri = await exportStoryAsPDF(story, entities, options);
      break;
    case 'docx':
      fileUri = await exportStoryAsDOCX(story, entities, options);
      break;
    case 'epub':
      fileUri = await exportStoryAsEPUB(story, entities, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  return fileUri;
};

/**
 * Save exported file to device
 * @param fileUri - URI of the file to save
 * @param filename - Filename for the saved file
 * @returns URI of the saved file
 */
export const saveExportedFile = async (
  fileUri: string,
  filename: string
): Promise<string> => {
  try {
    // Note: For expo-file-system, we don't need to save separately
    // The PDF is already generated in a temporary location
    // Sharing will handle the file correctly
    // On some platforms, sharing may handle saving automatically
    console.log('File ready for sharing:', fileUri);
    return fileUri;
  } catch (error) {
    console.error('Error preparing file:', error);
    // If there's an error, return original URI - sharing will still work
    console.warn('Failed to prepare file, using original URI for sharing');
    return fileUri;
  }
};

/**
 * Get MIME type for export format
 */
const getMimeType = (format: ExportFormat): string => {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'epub':
      return 'application/epub+zip';
    default:
      return 'application/octet-stream';
  }
};

/**
 * Get UTI for iOS sharing
 */
const getUTI = (format: ExportFormat): string => {
  switch (format) {
    case 'pdf':
      return 'com.adobe.pdf';
    case 'docx':
      return 'org.openxmlformats.wordprocessingml.document';
    case 'epub':
      return 'org.idpf.epub-container';
    default:
      return 'public.data';
  }
};

/**
 * Share exported file using expo-sharing
 * @param fileUri - URI of the file to share
 * @param filename - Optional filename for sharing
 * @param format - Export format
 * @returns True if sharing was successful
 */
export const shareExportedFile = async (
  fileUri: string,
  filename?: string,
  format: ExportFormat = 'pdf'
): Promise<boolean> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: getMimeType(format),
      dialogTitle: filename || 'Share Story',
      UTI: getUTI(format),
    });

    return true;
  } catch (error) {
    console.error('Error sharing file:', error);
    throw new Error(`Failed to share file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Export and share story in one operation
 * @param story - Story to export
 * @param entities - Story entities
 * @param options - Export options
 * @returns True if export and share were successful
 */
export const exportAndShareStory = async (
  story: Story,
  entities: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  },
  options: ExportOptions = {}
): Promise<boolean> => {
  try {
    // Export story
    const fileUri = await exportStory(story, entities, options);
    
    // Generate filename
    const format = options.format || 'pdf';
    const filename = generateFilename(story, format, options.type || 'full');
    
    // Share file
    await shareExportedFile(fileUri, filename, format);
    
    return true;
  } catch (error) {
    console.error('Error exporting and sharing story:', error);
    throw error;
  }
};

/**
 * Get export type options
 * @returns Array of export type options with labels
 */
export const getExportTypeOptions = (): Array<{ value: ExportType; label: string; description: string }> => {
  return [
    {
      value: 'full',
      label: 'Full Story',
      description: 'Export everything: story elements and generated content',
    },
    {
      value: 'elements-only',
      label: 'Elements Only',
      description: 'Export only story elements (characters, blurbs)',
    },
    {
      value: 'generated-only',
      label: 'Generated Content Only',
      description: 'Export only the generated story content',
    },
  ];
};

/**
 * Get format options
 * @returns Array of format options with labels
 */
export const getFormatOptions = (): Array<{ value: ExportFormat; label: string }> => {
  return [
    {
      value: 'pdf',
      label: 'PDF',
    },
    {
      value: 'docx',
      label: 'Word Document (DOCX)',
    },
    {
      value: 'epub',
      label: 'EPUB',
    },
  ];
};
