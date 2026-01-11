/**
 * Export Service
 * Handles exporting stories in various formats using expo-sharing
 */
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { generateStoryPDF } from './pdfGenerator';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';

export type ExportFormat = 'pdf';

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
  const sanitizedTitle = story.title
    .replace(/[^a-z0-9\s]/gi, '') // Remove special characters except spaces
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

  // PDF export includes only characters and blurbs
  // Exclude metadata, description, generated content, scenes, and chapters
  const charactersToInclude = entities.characters;
  const blurbsToInclude = entities.blurbs;
  const includeMetadata = false;
  const includeDescription = false;
  const includeGeneratedContent = false;

  // Always include characters and blurbs if they exist in entities
  const includeCharacters = !!charactersToInclude && charactersToInclude.length > 0;
  const includeBlurbs = !!blurbsToInclude && blurbsToInclude.length > 0;

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
 * Share exported file using expo-sharing
 * @param fileUri - URI of the file to share
 * @param filename - Optional filename for sharing
 * @returns True if sharing was successful
 */
export const shareExportedFile = async (
  fileUri: string,
  filename?: string
): Promise<boolean> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: filename || 'Share Story',
      UTI: 'com.adobe.pdf', // iOS UTI for PDF
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
    const filename = generateFilename(story, options.format || 'pdf', options.type || 'full');
    
    // Share file
    await shareExportedFile(fileUri, filename);
    
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
  ];
};
