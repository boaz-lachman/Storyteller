/**
 * Prompt building utility for AI story generation
 * Combines story elements with importance weighting and formats for AI API
 */
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../types';
import { formatStoryLength, formatStoryTheme, formatCharacterRole } from './formatting';

/**
 * Options for building a prompt
 */
export interface PromptBuilderOptions {
  complexity?: 'simple' | 'moderate' | 'complex';
  style?: string;
  additionalInstructions?: string;
  ttsFriendly?: boolean; // Format story for text-to-speech readability
}

/**
 * Build a comprehensive prompt for AI story generation
 * Combines all story elements with importance weighting
 * @param language - Language code ('en' or 'he'). If 'he', prompts will include Hebrew instructions.
 */
export const buildStoryPrompt = (
  story: Story,
  characters: Character[],
  blurbs: IdeaBlurb[],
  scenes: Scene[],
  chapters: Chapter[],
  options: PromptBuilderOptions = {},
  language: 'en' | 'he' = 'en'
): string => {
  const sections: string[] = [];

  // Story Overview Section
  sections.push('# STORY OVERVIEW');
  sections.push(`Title: ${story.title}`);
  if (story.description) {
    sections.push(`Description: ${story.description}`);
  }
  sections.push('');

  // Story Attributes Section
  sections.push('# STORY ATTRIBUTES');
  sections.push(`Length: ${formatStoryLength(story.length)}`);
  sections.push(`Theme: ${formatStoryTheme(story.theme)}`);
  sections.push(`Tone: ${story.tone}`);
  sections.push(`Point of View: ${story.pov}`);
  sections.push(`Target Audience: ${story.targetAudience}`);
  if (story.setting) {
    sections.push(`Setting: ${story.setting}`);
  }
  if (story.timePeriod) {
    sections.push(`Time Period: ${story.timePeriod}`);
  }
  sections.push('');

  // Characters Section (sorted by importance, then role)
  if (characters.length > 0) {
    sections.push('# CHARACTERS');
    // Sort by importance (descending), then by role priority
    const sortedCharacters = [...characters].sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      const rolePriority: Record<Character['role'], number> = {
        protagonist: 1,
        antagonist: 2,
        supporting: 3,
        minor: 4,
      };
      return rolePriority[a.role] - rolePriority[b.role];
    });

    sortedCharacters.forEach((character, index) => {
      sections.push(`## Character ${index + 1}: ${character.name}`);
      sections.push(`Role: ${formatCharacterRole(character.role)}`);
      sections.push(`Importance: ${character.importance}/10`);
      sections.push(`Description: ${character.description}`);
      if (character.traits && character.traits.length > 0) {
        sections.push(`Traits: ${character.traits.join(', ')}`);
      }
      if (character.backstory) {
        sections.push(`Backstory: ${character.backstory}`);
      }
      sections.push('');
    });
  }

  // Blurbs Section (sorted by importance)
  if (blurbs.length > 0) {
    sections.push('# STORY IDEAS & BLURBS');
    // Sort by importance (descending)
    const sortedBlurbs = [...blurbs].sort((a, b) => b.importance - a.importance);

    sortedBlurbs.forEach((blurb, index) => {
      sections.push(`## Idea ${index + 1}: ${blurb.title}`);
      sections.push(`Importance: ${blurb.importance}/10`);
      if (blurb.category) {
        sections.push(`Category: ${blurb.category}`);
      }
      sections.push(`Description: ${blurb.description}`);
      sections.push('');
    });
  }

  // Scenes Section (sorted by importance)
  if (scenes.length > 0) {
    sections.push('# SCENES');
    // Sort by importance (descending)
    const sortedScenes = [...scenes].sort((a, b) => b.importance - a.importance);

    // Create a character map for quick lookup
    const characterMap = new Map<string, Character>();
    characters.forEach((char) => {
      characterMap.set(char.id, char);
    });

    sortedScenes.forEach((scene, index) => {
      sections.push(`## Scene ${index + 1}: ${scene.title}`);
      sections.push(`Importance: ${scene.importance}/10`);
      sections.push(`Description: ${scene.description}`);
      sections.push(`Setting: ${scene.setting}`);
      if (scene.characters && scene.characters.length > 0) {
        // Resolve character IDs to names
        const characterNames = scene.characters
          .map((charId) => {
            const char = characterMap.get(charId);
            return char ? char.name : charId;
          })
          .filter(Boolean);
        if (characterNames.length > 0) {
          sections.push(`Characters: ${characterNames.join(', ')}`);
        }
      }
      if (scene.mood) {
        sections.push(`Mood: ${scene.mood}`);
      }
      if (scene.conflictLevel !== undefined) {
        sections.push(`Conflict Level: ${scene.conflictLevel}/10`);
      }
      sections.push('');
    });
  }

  // Chapters Section (sorted by order)
  if (chapters.length > 0) {
    sections.push('# CHAPTERS');
    // Sort by order (ascending)
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

    sortedChapters.forEach((chapter) => {
      sections.push(`## Chapter ${chapter.order}: ${chapter.title}`);
      sections.push(`Importance: ${chapter.importance}/10`);
      sections.push(`Description: ${chapter.description}`);
      sections.push('');
    });
  }

  // Generation Instructions Section
  sections.push('# GENERATION INSTRUCTIONS');
  
  if (options.complexity) {
    const complexityInstructions: Record<string, string> = {
      simple: 'Write a simple, straightforward short story with clear plot progression and easy-to-follow narrative.',
      moderate: 'Write a moderately complex story with some subplots and character development.',
      complex: 'Write a complex, multi-layered story with intricate plotlines, deep character arcs, and sophisticated narrative structure.',
    };
    sections.push(`Complexity: ${complexityInstructions[options.complexity] || options.complexity}`);
  }

  if (options.style) {
    sections.push(`Style: ${options.style}`);
  }

  // Add importance-based instructions
  sections.push('');
  sections.push('## Importance Guidelines:');
  sections.push('- Elements with higher importance (8-10) should be central to the story');
  sections.push('- Elements with medium importance (5-7) should be well-developed but secondary');
  sections.push('- Elements with lower importance (1-4) can be mentioned briefly or used for world-building');
  sections.push('');

  if (options.additionalInstructions) {
    sections.push('## Additional Instructions:');
    sections.push(options.additionalInstructions);
    sections.push('');
  }

  // Final instruction
  sections.push('# TASK');
  const taskInstruction = language === 'he'
    ? 'תבסס על כל המידע שסופק לעיל, צור סיפור מלא המשלב את הדמויות, הרעיונות, הסצנות והפרקים. ודא שהסיפור עוקב אחר המאפיינים שצוינו (נושא, טון, נקודת מבט, קהל יעד) ומכבד את רמות החשיבות של כל אלמנט. כתוב את כל הסיפור בעברית - כל הטקסט הנרטיבי, הדיאלוגים והתיאורים חייבים להיות בעברית.'
    : 'Based on all the information provided above, generate a complete story that incorporates the characters, ideas, scenes, and chapters. Ensure the story follows the specified attributes (theme, tone, POV, target audience) and respects the importance levels of each element.';
  sections.push(taskInstruction);

  return sections.join('\n');
};

/**
 * Build a simplified prompt for quick generation
 * Uses only the most important elements
 */
export const buildSimplePrompt = (
  story: Story,
  characters: Character[],
  blurbs: IdeaBlurb[],
  scenes: Scene[],
  options: PromptBuilderOptions = {}
): string => {
  const sections: string[] = [];

  sections.push(`Write a ${formatStoryLength(story.length).toLowerCase()} in the ${formatStoryTheme(story.theme).toLowerCase()} genre.`);
  sections.push(`Tone: ${story.tone}, POV: ${story.pov}, Target Audience: ${story.targetAudience}`);
  if (story.description) {
    sections.push(`Story concept: ${story.description}`);
  }
  sections.push('');

  // Only include high-importance elements (7+)
  const importantCharacters = characters
    .filter((c) => c.importance >= 7)
    .sort((a, b) => b.importance - a.importance);
  
  if (importantCharacters.length > 0) {
    sections.push('Key Characters:');
    importantCharacters.forEach((char) => {
      sections.push(`- ${char.name} (${formatCharacterRole(char.role)}): ${char.description}`);
    });
    sections.push('');
  }

  const importantBlurbs = blurbs
    .filter((b) => b.importance >= 7)
    .sort((a, b) => b.importance - a.importance);
  
  if (importantBlurbs.length > 0) {
    sections.push('Key Ideas:');
    importantBlurbs.forEach((blurb) => {
      sections.push(`- ${blurb.title}: ${blurb.description}`);
    });
    sections.push('');
  }

  const importantScenes = scenes
    .filter((s) => s.importance >= 7)
    .sort((a, b) => b.importance - a.importance);
  
  if (importantScenes.length > 0) {
    sections.push('Key Scenes:');
    importantScenes.forEach((scene) => {
      sections.push(`- ${scene.title}: ${scene.description} (Setting: ${scene.setting})`);
    });
    sections.push('');
  }

  if (options.additionalInstructions) {
    sections.push(`Additional instructions: ${options.additionalInstructions}`);
  }

  return sections.join('\n');
};

/**
 * Format prompt for Claude API message format
 * Note: Claude API uses 'user' and 'assistant' roles only
 * System instructions should be included in the user message or as the first user message
 */
export const formatPromptForClaude = (
  prompt: string,
  systemPrompt?: string
): Array<{ role: 'user' | 'assistant'; content: string }> => {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Combine system prompt with user prompt if provided
  const fullPrompt = systemPrompt 
    ? `${systemPrompt}\n\n${prompt}`
    : prompt;

  messages.push({
    role: 'user',
    content: fullPrompt,
  });

  return messages;
};

/**
 * Get default system prompt for story generation
 * @param language - Language code ('en' or 'he'). If 'he', the story will be generated in Hebrew.
 * @param ttsFriendly - If true, includes detailed TTS formatting instructions
 */
export const getDefaultSystemPrompt = (language: 'en' | 'he' = 'en', ttsFriendly: boolean = false): string => {
  const basePrompt = `You are a creative writing assistant specializing in story generation. 
Your task is to create engaging, well-structured stories based on provided elements including characters, plot ideas, scenes, and story attributes.

Guidelines:
- Follow the specified story attributes (theme, tone, point of view, target audience)
- Incorporate all provided elements, giving more emphasis to those with higher importance ratings
- Maintain consistency in character development and plot progression
- Create a cohesive narrative that flows naturally
- Respect the specified length requirements
- Write in a style appropriate for the target audience`;

  // Add TTS-friendly formatting instructions if requested
  const ttsInstructions = ttsFriendly ? `

TEXT-TO-SPEECH FORMATTING REQUIREMENTS:
The story will be read aloud by text-to-speech software, so format it to be easily spoken:

1. DIALOGUE FORMATTING:
   - Use simple, clear dialogue tags: "said", "asked", "replied", "whispered", "shouted"
   - Always attribute dialogue clearly (e.g., "John said" rather than leaving it ambiguous)
   - Format dialogue as: "Dialogue text here," character said. (with comma before the dialogue tag)
   - Avoid complex dialogue tags like "exclaimed incredulously" - keep them simple

2. NUMBERS AND DATES:
   - Spell out numbers up to one hundred (e.g., "twenty", "forty-five", "ninety-nine")
   - For larger round numbers, use words when natural (e.g., "one thousand", "two million")
   - Write dates in spoken format: "January first" instead of "Jan 1st", "the fifteenth of March" instead of "3/15"
   - Write times in spoken format: "three o'clock" instead of "3:00", "half past two" instead of "2:30"

3. ABBREVIATIONS:
   - Spell out all abbreviations: "mister" instead of "Mr.", "doctor" instead of "Dr."
   - Spell out titles: "professor" instead of "Prof.", "senator" instead of "Sen."

4. PUNCTUATION AND FORMATTING:
   - Use simple punctuation - avoid nested quotes or complex punctuation structures
   - Use paragraph breaks to indicate natural pauses in the narrative
   - NO markdown formatting: no headers (#), no bold/italic markers (*, **, _), no code blocks
   - NO special formatting characters: no asterisks, no special symbols that might confuse TTS
   - Use standard quotation marks for dialogue: "Like this," she said.

5. SENTENCE STRUCTURE:
   - Use clear, straightforward sentence structures that flow naturally when spoken
   - Avoid overly complex nested clauses that might be hard to parse when read aloud
   - Break long sentences into shorter, more digestible ones when appropriate

6. SPECIAL CHARACTERS AND SYMBOLS:
   - Avoid symbols like @, #, %, & - spell them out if needed (e.g., "at", "number", "percent", "and")
   - Write currency in words when possible: "twenty dollars" instead of "$20" (or keep simple like "$20" if it reads well)
   - Avoid ellipses (...) in favor of complete sentences or "he paused" type descriptions

7. GENERAL:
   - Write in plain text only - the story should be readable and natural when spoken aloud
   - Think about how the text will sound when read by a TTS voice, not just how it looks on the page
   - Maintain good narrative flow while ensuring every word can be clearly spoken` : '';

  const fullPrompt = basePrompt + ttsInstructions;

  // Add language instruction if Hebrew
  if (language === 'he') {
    return `${fullPrompt}

IMPORTANT: Write the entire story in Hebrew. All narrative text, dialogue, and descriptions must be in Hebrew.`;
  }

  return fullPrompt;
};
