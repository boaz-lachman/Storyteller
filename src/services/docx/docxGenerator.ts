/**
 * DOCX Generator Service
 * Creates DOCX documents from story data using docx library
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, SectionType } from 'docx';
import * as FileSystem from 'expo-file-system/legacy';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';

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

  const children: (Paragraph | SectionType)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: story.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata section
  if (includeMetadata) {
    children.push(
      new Paragraph({
        text: 'Story Information',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const metadataItems = [
      { label: 'Length', value: formatValue(story.length) },
      { label: 'Theme', value: formatValue(story.theme) },
      { label: 'Tone', value: formatValue(story.tone) },
      { label: 'Point of View', value: formatValue(story.pov) },
      { label: 'Target Audience', value: formatValue(story.targetAudience) },
      { label: 'Status', value: formatValue(story.status) },
      ...(story.setting ? [{ label: 'Setting', value: story.setting }] : []),
      ...(story.timePeriod ? [{ label: 'Time Period', value: story.timePeriod }] : []),
    ];

    metadataItems.forEach((item) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${item.label}: `,
              bold: true,
            }),
            new TextRun({
              text: item.value,
            }),
          ],
          spacing: { after: 150 },
        })
      );
    });
  }

  // Description section
  if (includeDescription && story.description) {
    children.push(
      new Paragraph({
        text: 'Description',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        text: story.description,
        spacing: { after: 300 },
      })
    );
  }

  // Generated content section
  if (includeGeneratedContent && story.generatedContent) {
    children.push(
      new Paragraph({
        text: 'Story Content',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Split content into paragraphs and add them
    const contentParagraphs = story.generatedContent.split(/\n\n+/).filter(p => p.trim());
    contentParagraphs.forEach((paragraph, index) => {
      children.push(
        new Paragraph({
          text: paragraph.trim(),
          spacing: { 
            after: index < contentParagraphs.length - 1 ? 200 : 300,
            before: index > 0 ? 0 : 0,
          },
          indent: { firstLine: 720 }, // 0.5 inch indent for first line
        })
      );
    });
  }

  // Characters section
  if (includeCharacters && characters.length > 0) {
    children.push(
      new Paragraph({
        text: 'Characters',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    characters.forEach((character) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: character.name,
              bold: true,
              size: 28, // 14pt
            }),
            new TextRun({
              text: ` (${formatRole(character.role)})`,
              italics: true,
              size: 24, // 12pt
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          text: character.description,
          spacing: { after: 100 },
        })
      );

      if (character.traits && character.traits.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Traits: ',
                bold: true,
              }),
              new TextRun({
                text: character.traits.join(', '),
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (character.backstory) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Backstory: ',
                bold: true,
              }),
              new TextRun({
                text: character.backstory,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    });
  }

  // Blurbs section
  if (includeBlurbs && blurbs.length > 0) {
    children.push(
      new Paragraph({
        text: 'Story Ideas & Blurbs',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    blurbs.forEach((blurb) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: blurb.title,
              bold: true,
              size: 28, // 14pt
            }),
            ...(blurb.category ? [
              new TextRun({
                text: ` (${formatCategory(blurb.category)})`,
                italics: true,
                size: 24, // 12pt
              }),
            ] : []),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          text: blurb.description,
          spacing: { after: 200 },
        })
      );
    });
  }

  // Footer
  children.push(
    new Paragraph({
      text: `Generated on ${new Date().toLocaleString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      style: 'subtle',
    })
  );

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
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
