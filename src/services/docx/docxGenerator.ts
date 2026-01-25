/**
 * DOCX Generator Service
 * Creates DOCX documents from story data using docx library
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import * as FileSystem from 'expo-file-system/legacy';
import type { Story, Character, IdeaBlurb } from '../../types';
import { getTextDirection, isHebrew } from '../../utils/languageDetection';
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

export interface DocxOptions {
  characters?: Character[];
  blurbs?: IdeaBlurb[];
  includeCharacters?: boolean;
  includeBlurbs?: boolean;
  includeMetadata?: boolean;
  includeDescription?: boolean;
  includeGeneratedContent?: boolean;
}

/**
 * Generate a DOCX document from story data
 * @param story - Story object to convert to DOCX
 * @param options - Optional formatting options
 * @returns URI of the generated DOCX file
 */
export const generateStoryDOCX = async (
  story: Story,
  options?: DocxOptions
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

  // Detect text direction and language
  const textDirection = getTextDirection(story.title);
  const isRTLText = textDirection === 'rtl';
  const defaultAlignment = isRTLText ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const language: 'en' | 'he' = isHebrew(story.title) ? 'he' : 'en';
  const t = getExportTranslations(language);

  const children: Paragraph[] = [];

  // Title - with enhanced styling
  children.push(
    new Paragraph({
      text: story.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      bidirectional: isRTLText,
      style: 'Title',
    })
  );

  // Metadata section
  if (includeMetadata) {
    children.push(
      new Paragraph({
        text: t.storyInformation,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 300 },
        alignment: defaultAlignment,
        bidirectional: isRTLText,
        shading: {
          fill: 'E8EAF0',
        },
      })
    );

    const metadataItems = [
      { label: t.length, value: translateLength(story.length, language) },
      { label: t.theme, value: translateTheme(story.theme, language) },
      { label: t.tone, value: translateTone(story.tone, language) },
      { label: t.pov, value: translatePOV(story.pov, language) },
      { label: t.targetAudience, value: translateTargetAudience(story.targetAudience, language) },
      ...(story.setting ? [{ label: t.setting, value: story.setting }] : []),
      ...(story.timePeriod ? [{ label: t.timePeriod, value: story.timePeriod }] : []),
    ];

    metadataItems.forEach((item) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${item.label}: `,
              bold: true,
              color: colors.primary.replace('#', ''),
              size: 24,
            }),
            new TextRun({
              text: item.value,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
          alignment: defaultAlignment,
          bidirectional: isRTLText,
          indent: { left: 360, right: 360 },
        })
      );
    });
  }

  // Description section
  if (includeDescription && story.description) {
    const descriptionDir = getTextDirection(story.description);
    const isDescRTL = descriptionDir === 'rtl';
    const descAlignment = isDescRTL ? AlignmentType.RIGHT : AlignmentType.LEFT;

    children.push(
      new Paragraph({
        text: t.description,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 300 },
        alignment: descAlignment,
        bidirectional: isDescRTL,
        shading: {
          fill: 'E8EAF0',
        },
      })
    );

    children.push(
      new Paragraph({
        text: story.description,
        spacing: { after: 400 },
        alignment: AlignmentType.JUSTIFIED,
        bidirectional: isDescRTL,
        style: 'Normal',
      })
    );
  }

  // Generated content section
  if (includeGeneratedContent && story.generatedContent) {
    const contentDir = getTextDirection(story.generatedContent);
    const isContentRTL = contentDir === 'rtl';
    const contentAlignment = isContentRTL ? AlignmentType.RIGHT : AlignmentType.LEFT;

    children.push(
      new Paragraph({
        text: t.storyContent,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 300 },
        alignment: contentAlignment,
        bidirectional: isContentRTL,
        shading: {
          fill: 'E8EAF0',
        },
      })
    );

    // Split content into paragraphs and add them
    const contentParagraphs = story.generatedContent.split(/\n\n+/).filter(p => p.trim());
    contentParagraphs.forEach((paragraph, index) => {
      children.push(
        new Paragraph({
          text: paragraph.trim(),
          spacing: {
            after: index < contentParagraphs.length - 1 ? 240 : 400,
            before: index > 0 ? 0 : 0,
          },
          indent: { firstLine: isContentRTL ? 0 : 720 }, // 0.5 inch indent for LTR only
          alignment: AlignmentType.JUSTIFIED,
          bidirectional: isContentRTL,
        })
      );
    });
  }

  // Characters section
  if (includeCharacters && characters.length > 0) {
    children.push(
      new Paragraph({
        text: t.characters,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 300 },
        alignment: defaultAlignment,
        bidirectional: isRTLText,
        shading: {
          fill: 'E8EAF0',
        },
      })
    );

    characters.forEach((character, index) => {
      const characterDir = getTextDirection(character.name);
      const isCharRTL = characterDir === 'rtl';
      const charAlignment = isCharRTL ? AlignmentType.RIGHT : AlignmentType.LEFT;

      // Character name with role badge
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: character.name,
              bold: true,
              size: 32, // 16pt
              color: colors.text.replace('#', ''),
            }),
            new TextRun({
              text: ` (${translateRole(character.role, language)})`,
              italics: true,
              size: 26, // 13pt
              color: colors.primary.replace('#', ''),
            }),
          ],
          spacing: { before: index > 0 ? 400 : 200, after: 200 },
          alignment: charAlignment,
          bidirectional: isCharRTL,
          border: {
            bottom: {
              color: colors.primary.replace('#', ''),
              space: 1,
              size: 6,
              style: 'single',
            },
          },
        })
      );

      // Description
      children.push(
        new Paragraph({
          text: character.description,
          spacing: { after: 150 },
          alignment: charAlignment,
          bidirectional: isCharRTL,
          indent: { left: 240, right: 240 },
        })
      );

      // Traits
      if (character.traits && character.traits.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${t.traits}: `,
                bold: true,
                color: colors.primary.replace('#', ''),
                size: 24,
              }),
              new TextRun({
                text: character.traits.join(', '),
                size: 24,
              }),
            ],
            spacing: { after: 150 },
            alignment: charAlignment,
            bidirectional: isCharRTL,
            indent: { left: 240, right: 240 },
          })
        );
      }

      // Backstory
      if (character.backstory) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${t.backstory}: `,
                bold: true,
                color: colors.primary.replace('#', ''),
                size: 24,
              }),
              new TextRun({
                text: character.backstory,
                size: 24,
              }),
            ],
            spacing: { after: 250 },
            alignment: charAlignment,
            bidirectional: isCharRTL,
            indent: { left: 240, right: 240 },
          })
        );
      }
    });
  }

  // Blurbs section
  if (includeBlurbs && blurbs.length > 0) {
    children.push(
      new Paragraph({
        text: t.storyIdeas,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 300 },
        alignment: defaultAlignment,
        bidirectional: isRTLText,
        shading: {
          fill: 'E8EAF0',
        },
      })
    );

    blurbs.forEach((blurb, index) => {
      const blurbDir = getTextDirection(blurb.title);
      const isBlurbRTL = blurbDir === 'rtl';
      const blurbAlignment = isBlurbRTL ? AlignmentType.RIGHT : AlignmentType.LEFT;

      // Blurb title with category badge
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: blurb.title,
              bold: true,
              size: 32, // 16pt
              color: colors.text.replace('#', ''),
            }),
            ...(blurb.category ? [
              new TextRun({
                text: ` (${translateCategory(blurb.category, language)})`,
                italics: true,
                size: 26, // 13pt
                color: colors.warning.replace('#', ''),
              }),
            ] : []),
          ],
          spacing: { before: index > 0 ? 400 : 200, after: 200 },
          alignment: blurbAlignment,
          bidirectional: isBlurbRTL,
          border: {
            bottom: {
              color: colors.warning.replace('#', ''),
              space: 1,
              size: 6,
              style: 'single',
            },
          },
        })
      );

      // Blurb description
      children.push(
        new Paragraph({
          text: blurb.description,
          spacing: { after: 250 },
          alignment: blurbAlignment,
          bidirectional: isBlurbRTL,
          indent: { left: 240, right: 240 },
        })
      );
    });
  }

  // Footer
  children.push(
    new Paragraph({
      text: '',
      spacing: { before: 800 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${t.generatedOn} ${new Date().toLocaleString()}`,
          italics: true,
          color: colors.textTertiary.replace('#', ''),
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      border: {
        top: {
          color: colors.borderLight.replace('#', ''),
          space: 1,
          size: 12,
          style: 'single',
        },
      },
    })
  );

  // Create the document with enhanced styling
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            size: 24, // 12pt
            font: isRTLText ? 'Arial' : 'Georgia',
          },
          paragraph: {
            spacing: {
              line: 360, // 1.5 line spacing
              before: 120,
              after: 120,
            },
          },
        },
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          run: {
            size: 56, // 28pt
            bold: true,
            color: colors.text.replace('#', ''),
            font: isRTLText ? 'Arial' : 'Georgia',
          },
          paragraph: {
            spacing: {
              after: 600,
            },
            alignment: AlignmentType.CENTER,
          },
        },
      ],
    },
  });

  // Generate the DOCX file as base64 string
  const base64 = await Packer.toBase64String(doc);
  
  // Save to file system
  const filename = `story_${Date.now()}.docx`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  
  // Use EncodingType if available, otherwise use string literal
  // SDK 54+ may not have EncodingType enum, so fallback to string
  const encoding = (FileSystem as any).EncodingType?.Base64 ?? 'base64';
  
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: encoding,
  });

  return fileUri;
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
