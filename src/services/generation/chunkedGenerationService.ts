/**
 * Chunked Generation Service
 * Handles chapter-by-chapter or scene-by-scene story generation for longer works (novellas)
 * Manages context, progress tracking, and error handling
 */
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';
import type { GenerateStoryRequest, GenerateStoryResponse } from '../../store/api/claudeApi';
import { store } from '../../store';
import { claudeApi } from '../../store/api/claudeApi';
import { buildStoryPrompt, formatPromptForClaude, getDefaultSystemPrompt, type PromptBuilderOptions } from '../../utils/promptBuilder';
import { countWords } from '../../utils/helpers';
import { CLAUDE_API } from '../../constants/apiConstants';

/**
 * Progress information for chunked generation
 */
export interface ChunkedGenerationProgress {
  currentChunk: number;
  totalChunks: number;
  completedChunks: number;
  currentChunkContent?: string;
  completedContent: string; // All completed chunks combined
  isComplete: boolean;
  error?: string;
}

/**
 * Options for chunked generation
 */
export interface ChunkedGenerationOptions extends PromptBuilderOptions {
  maxTokensPerChapter?: number; // Default: CLAUDE_API.MAX_TOKENS_PER_CHAPTER
  onProgress?: (progress: ChunkedGenerationProgress) => void;
  onChapterComplete?: (chapterNumber: number, content: string) => void;
  onTokenWarning?: (currentTokens: number, warningThreshold: number) => void;
}

/**
 * Result of chunked generation
 */
export interface ChunkedGenerationResult {
  completeContent: string;
  totalWordCount: number;
  chunks: Array<{
    chunkNumber: number;
    chunkTitle: string;
    content: string;
    wordCount: number;
    wasCutOff?: boolean;
  }>;
  cutOffChunks: number[]; // Array of chunk numbers that were cut off
  totalUsage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Virtual chunk structure for novellas without chapters
 */
interface VirtualChunk {
  order: number;
  title: string;
  description: string;
  scenes?: Scene[];
  blurbs?: IdeaBlurb[];
}

/**
 * Build context for a specific chapter generation
 * Includes story metadata + all previous chapters
 */
function buildChapterContext(
  story: Story,
  characters: Character[],
  blurbs: IdeaBlurb[],
  scenes: Scene[],
  chapters: Chapter[],
  currentChapter: Chapter,
  previousChaptersContent: string[],
  options: PromptBuilderOptions
): string {
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
  sections.push(`Length: ${story.length}`);
  sections.push(`Theme: ${story.theme}`);
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

  // Characters Section (sorted by importance)
  if (characters.length > 0) {
    sections.push('# CHARACTERS');
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
      sections.push(`Role: ${character.role}`);
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

  // Blurbs Section
  if (blurbs.length > 0) {
    sections.push('# STORY IDEAS & BLURBS');
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

  // Scenes Section
  if (scenes.length > 0) {
    sections.push('# SCENES');
    const sortedScenes = [...scenes].sort((a, b) => b.importance - a.importance);
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

  // Previous Chapters Section (for continuity)
  if (previousChaptersContent.length > 0) {
    sections.push('# PREVIOUS CHAPTERS');
    sections.push('The following chapters have already been written. Use them for context and continuity:');
    sections.push('');
    previousChaptersContent.forEach((content, index) => {
      const chapterNum = index + 1;
      sections.push(`## Chapter ${chapterNum} Content:`);
      sections.push(content);
      sections.push('');
    });
  }

  // Current Chapter Section
  sections.push('# CURRENT CHAPTER TO GENERATE');
  sections.push(`## Chapter ${currentChapter.order}: ${currentChapter.title}`);
  sections.push(`Description: ${currentChapter.description}`);
  sections.push(`Importance: ${currentChapter.importance}/10`);
  sections.push('');

  // Generation Instructions
  sections.push('# GENERATION INSTRUCTIONS');
  
  if (options.complexity) {
    const complexityInstructions: Record<string, string> = {
      simple: 'Write a simple, straightforward chapter with clear plot progression.',
      moderate: 'Write a moderately complex chapter with some subplots and character development.',
      complex: 'Write a complex, multi-layered chapter with intricate plotlines and deep character arcs.',
    };
    sections.push(`Complexity: ${complexityInstructions[options.complexity] || options.complexity}`);
  }

  if (options.style) {
    sections.push(`Style: ${options.style}`);
  }

  sections.push('');
  sections.push('## Importance Guidelines:');
  sections.push('- Elements with higher importance (8-10) should be central to this chapter');
  sections.push('- Elements with medium importance (5-7) should be well-developed but secondary');
  sections.push('- Elements with lower importance (1-4) can be mentioned briefly');
  sections.push('');
  sections.push('## Continuity Requirements:');
  sections.push('- Maintain consistency with previous chapters');
  sections.push('- Continue character development and plot progression naturally');
  sections.push('- Ensure smooth transitions from previous chapters');
  sections.push('');

  if (options.additionalInstructions) {
    sections.push('## Additional Instructions:');
    sections.push(options.additionalInstructions);
    sections.push('');
  }

  // Final instruction
  sections.push('# TASK');
  sections.push(`Generate Chapter ${currentChapter.order}: "${currentChapter.title}" based on the information above. The chapter should be complete, well-written, and seamlessly continue from the previous chapters.`);

  return sections.join('\n');
}

/**
 * Build context for a scene-based chunk (for novellas without chapters)
 */
function buildSceneChunkContext(
  story: Story,
  characters: Character[],
  blurbs: IdeaBlurb[],
  scenes: Scene[],
  currentChunk: VirtualChunk,
  previousChunksContent: string[],
  options: PromptBuilderOptions
): string {
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
  sections.push(`Length: ${story.length}`);
  sections.push(`Theme: ${story.theme}`);
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

  // Characters Section
  if (characters.length > 0) {
    sections.push('# CHARACTERS');
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
      sections.push(`Role: ${character.role}`);
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

  // All Blurbs Section (for reference)
  if (blurbs.length > 0) {
    sections.push('# STORY IDEAS & BLURBS');
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

  // Previous Chunks Section (for continuity)
  if (previousChunksContent.length > 0) {
    sections.push('# PREVIOUS SECTIONS');
    sections.push('The following sections have already been written. Use them for context and continuity:');
    sections.push('');
    previousChunksContent.forEach((content, index) => {
      sections.push(`## Section ${index + 1} Content:`);
      sections.push(content);
      sections.push('');
    });
  }

  // Current Chunk Section
  sections.push('# CURRENT SECTION TO GENERATE');
  sections.push(`## Section ${currentChunk.order}: ${currentChunk.title}`);
  sections.push(`Description: ${currentChunk.description}`);
  
  // Include specific scenes for this chunk
  if (currentChunk.scenes && currentChunk.scenes.length > 0) {
    sections.push('');
    sections.push('### Scenes to Include in This Section:');
    const characterMap = new Map<string, Character>();
    characters.forEach((char) => {
      characterMap.set(char.id, char);
    });
    
    currentChunk.scenes.forEach((scene, index) => {
      sections.push(`#### Scene ${index + 1}: ${scene.title}`);
      sections.push(`Importance: ${scene.importance}/10`);
      sections.push(`Description: ${scene.description}`);
      sections.push(`Setting: ${scene.setting}`);
      if (scene.characters && scene.characters.length > 0) {
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

  // Include specific blurbs for this chunk
  if (currentChunk.blurbs && currentChunk.blurbs.length > 0) {
    sections.push('');
    sections.push('### Key Ideas to Include in This Section:');
    currentChunk.blurbs.forEach((blurb, index) => {
      sections.push(`#### Idea ${index + 1}: ${blurb.title}`);
      sections.push(`Importance: ${blurb.importance}/10`);
      sections.push(`Description: ${blurb.description}`);
      sections.push('');
    });
  }

  sections.push('');

  // Generation Instructions
  sections.push('# GENERATION INSTRUCTIONS');
  
  if (options.complexity) {
    const complexityInstructions: Record<string, string> = {
      simple: 'Write a simple, straightforward section with clear plot progression.',
      moderate: 'Write a moderately complex section with some subplots and character development.',
      complex: 'Write a complex, multi-layered section with intricate plotlines and deep character arcs.',
    };
    sections.push(`Complexity: ${complexityInstructions[options.complexity] || options.complexity}`);
  }

  if (options.style) {
    sections.push(`Style: ${options.style}`);
  }

  sections.push('');
  sections.push('## Continuity Requirements:');
  sections.push('- Maintain consistency with previous sections');
  sections.push('- Continue character development and plot progression naturally');
  sections.push('- Ensure smooth transitions from previous sections');
  sections.push('');

  if (options.additionalInstructions) {
    sections.push('## Additional Instructions:');
    sections.push(options.additionalInstructions);
    sections.push('');
  }

  // Final instruction
  sections.push('# TASK');
  sections.push(`Generate Section ${currentChunk.order}: "${currentChunk.title}" based on the information above. This section should be a substantial part of the novella, well-written, and seamlessly continue from the previous sections.`);

  return sections.join('\n');
}

/**
 * Create virtual chunks from scenes for novellas without chapters
 */
function createVirtualChunksFromScenes(
  scenes: Scene[],
  blurbs: IdeaBlurb[]
): VirtualChunk[] {
  if (scenes.length === 0) {
    // If no scenes, create chunks from blurbs or a single chunk
    if (blurbs.length > 0) {
      // Group blurbs into chunks (3-4 blurbs per chunk)
      const chunksPerBlurb = Math.ceil(blurbs.length / 3);
      const chunks: VirtualChunk[] = [];
      
      for (let i = 0; i < blurbs.length; i += chunksPerBlurb) {
        const chunkBlurbs = blurbs.slice(i, i + chunksPerBlurb);
        chunks.push({
          order: chunks.length + 1,
          title: `Section ${chunks.length + 1}`,
          description: `This section incorporates the following ideas: ${chunkBlurbs.map(b => b.title).join(', ')}`,
          blurbs: chunkBlurbs,
        });
      }
      
      return chunks;
    }
    
    // Fallback: single chunk
    return [{
      order: 1,
      title: 'Section 1',
      description: 'The opening section of the story',
    }];
  }

  // Group scenes into chunks (2-3 scenes per chunk for better context)
  const scenesPerChunk = Math.max(2, Math.ceil(scenes.length / 5)); // Aim for 3-5 chunks
  const sortedScenes = [...scenes].sort((a, b) => b.importance - a.importance);
  const chunks: VirtualChunk[] = [];

  for (let i = 0; i < sortedScenes.length; i += scenesPerChunk) {
    const chunkScenes = sortedScenes.slice(i, i + scenesPerChunk);
    chunks.push({
      order: chunks.length + 1,
      title: `Section ${chunks.length + 1}: ${chunkScenes.map(s => s.title).join(' / ')}`,
      description: `This section includes the following scenes: ${chunkScenes.map(s => s.title).join(', ')}`,
      scenes: chunkScenes,
    });
  }

  return chunks;
}

/**
 * Generate a single chunk (chapter or scene-based)
 */
async function generateChunk(
  story: Story,
  characters: Character[],
  blurbs: IdeaBlurb[],
  scenes: Scene[],
  chapters: Chapter[],
  currentChunk: Chapter | VirtualChunk,
  previousChunksContent: string[],
  options: PromptBuilderOptions & { maxTokensPerChapter?: number },
  isVirtualChunk: boolean
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number }; wasCutOff: boolean }> {
  let context: string;
  
  if (isVirtualChunk) {
    context = buildSceneChunkContext(
      story,
      characters,
      blurbs,
      scenes,
      currentChunk as VirtualChunk,
      previousChunksContent,
      options
    );
  } else {
    context = buildChapterContext(
      story,
      characters,
      blurbs,
      scenes,
      chapters,
      currentChunk as Chapter,
      previousChunksContent,
      options
    );
  }

  const systemPrompt = getDefaultSystemPrompt();
  const messages = formatPromptForClaude(context, systemPrompt);

  // Use configured limit, but cap at Claude's maximum (16384)
  const maxTokens = Math.min(
    options.maxTokensPerChapter || CLAUDE_API.MAX_TOKENS_PER_CHAPTER,
    16384
  );

  const result = await store.dispatch(
    claudeApi.endpoints.generateStory.initiate({
      messages,
      maxTokens,
      systemPrompt,
    })
  ).unwrap();

  // Check if generation was cut off
  if (result.wasCutOff) {
    console.warn(`Chunk generation was cut off due to max_tokens limit (${maxTokens}). Content may be incomplete.`);
  }

  return {
    content: result.content,
    usage: result.usage,
    wasCutOff: result.wasCutOff || false,
  };
}

/**
 * Generate story in chunks (chapter-by-chapter or scene-by-scene)
 * Returns complete story content and metadata
 */
export async function generateStoryChunked(
  story: Story,
  characters: Character[],
  blurbs: IdeaBlurb[],
  scenes: Scene[],
  chapters: Chapter[],
  options: ChunkedGenerationOptions = {}
): Promise<ChunkedGenerationResult> {
  // Determine if we're using chapters or creating virtual chunks
  const hasChapters = chapters.length > 0;
  let chunksToGenerate: Array<Chapter | VirtualChunk>;
  let isUsingVirtualChunks = false;

  if (hasChapters) {
    // Validate chapter count limit
    if (chapters.length > CLAUDE_API.MAX_CHAPTERS_FOR_GENERATION) {
      throw new Error(
        `Too many chapters. Maximum ${CLAUDE_API.MAX_CHAPTERS_FOR_GENERATION} chapters allowed per generation to control costs.`
      );
    }
    // Sort chapters by order
    chunksToGenerate = [...chapters].sort((a, b) => a.order - b.order);
  } else {
    // For novellas without chapters, create virtual chunks from scenes or other elements
    if (story.length !== 'novella') {
      throw new Error('Chunked generation without chapters is only available for novellas. Please add chapters or use single-call generation.');
    }
    
    isUsingVirtualChunks = true;
    chunksToGenerate = createVirtualChunksFromScenes(scenes, blurbs);
    
    // Limit virtual chunks too
    if (chunksToGenerate.length > CLAUDE_API.MAX_CHAPTERS_FOR_GENERATION) {
      chunksToGenerate = chunksToGenerate.slice(0, CLAUDE_API.MAX_CHAPTERS_FOR_GENERATION);
    }
  }

  const completedChunks: Array<{
    chunkNumber: number;
    chunkTitle: string;
    content: string;
    wordCount: number;
    wasCutOff?: boolean;
  }> = [];
  const cutOffChunks: number[] = [];

  const previousChunksContent: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Generate each chunk sequentially
  for (let i = 0; i < chunksToGenerate.length; i++) {
    const chunk = chunksToGenerate[i];
    const chunkNumber = hasChapters ? (chunk as Chapter).order : (chunk as VirtualChunk).order;
    const chunkTitle = hasChapters ? (chunk as Chapter).title : (chunk as VirtualChunk).title;

    // Check total token usage limit before generating next chunk
    const estimatedTotalTokens = totalInputTokens + totalOutputTokens;
    if (estimatedTotalTokens >= CLAUDE_API.MAX_TOTAL_TOKENS_PER_GENERATION) {
      throw new Error(
        `Token limit reached. Maximum ${CLAUDE_API.MAX_TOTAL_TOKENS_PER_GENERATION.toLocaleString()} tokens allowed per generation. ` +
        `Generated ${i} of ${chunksToGenerate.length} chunks before hitting the limit.`
      );
    }

    // Warn if approaching token limit
    if (options.onTokenWarning && estimatedTotalTokens >= CLAUDE_API.WARNING_THRESHOLD_TOKENS) {
      options.onTokenWarning(estimatedTotalTokens, CLAUDE_API.WARNING_THRESHOLD_TOKENS);
    }

    try {
      // Report progress
      if (options.onProgress) {
        options.onProgress({
          currentChunk: chunkNumber,
          totalChunks: chunksToGenerate.length,
          completedChunks: completedChunks.length,
          completedContent: previousChunksContent.join('\n\n'),
          isComplete: false,
        });
      }

      // Generate chunk
      const { content, usage, wasCutOff } = await generateChunk(
        story,
        characters,
        blurbs,
        scenes,
        chapters,
        chunk,
        previousChunksContent,
        options,
        isUsingVirtualChunks
      );

      totalInputTokens += usage.inputTokens;
      totalOutputTokens += usage.outputTokens;

      // Warn if chunk was cut off
      if (wasCutOff) {
        const chunkLabel = hasChapters ? 'Chapter' : 'Section';
        console.warn(`${chunkLabel} ${chunkNumber} was cut off due to token limit. Consider increasing maxTokensPerChapter.`);
        cutOffChunks.push(chunkNumber);
        
        // Report warning in progress
        if (options.onProgress) {
          options.onProgress({
            currentChunk: chunkNumber,
            totalChunks: chunksToGenerate.length,
            completedChunks: completedChunks.length,
            completedContent: previousChunksContent.join('\n\n'),
            isComplete: false,
            error: `Warning: ${chunkLabel} ${chunkNumber} was cut off mid-generation due to token limit. Content may be incomplete.`,
          });
        }
      }

      const wordCount = countWords(content);

      // Store completed chunk
      completedChunks.push({
        chunkNumber,
        chunkTitle,
        content,
        wordCount,
        wasCutOff,
      });

      // Add to previous chunks for next iteration
      const chunkLabel = hasChapters ? 'Chapter' : 'Section';
      previousChunksContent.push(`# ${chunkLabel} ${chunkNumber}: ${chunkTitle}\n\n${content}`);

      // Report chunk completion
      if (options.onChapterComplete) {
        options.onChapterComplete(chunkNumber, content);
      }

      // Check if we've exceeded the total token limit after this chunk
      const currentTotalTokens = totalInputTokens + totalOutputTokens;
      if (currentTotalTokens >= CLAUDE_API.MAX_TOTAL_TOKENS_PER_GENERATION) {
        // Stop generation and return what we have
        console.warn(
          `Token limit reached after ${chunkLabel} ${chunkNumber}. ` +
          `Generated ${i + 1} of ${chunksToGenerate.length} chunks. ` +
          `Total tokens used: ${currentTotalTokens.toLocaleString()}`
        );
        
        // Report final progress with warning
        if (options.onProgress) {
          options.onProgress({
            currentChunk: chunkNumber,
            totalChunks: chunksToGenerate.length,
            completedChunks: completedChunks.length,
            completedContent: previousChunksContent.join('\n\n'),
            isComplete: false,
            error: `Token limit reached. Only ${completedChunks.length} of ${chunksToGenerate.length} chunks were generated.`,
          });
        }

        // Return partial result
        const partialContent = completedChunks
          .map((ch) => {
            const label = hasChapters ? 'Chapter' : 'Section';
            return `# ${label} ${ch.chunkNumber}: ${ch.chunkTitle}\n\n${ch.content}`;
          })
          .join('\n\n');

        const partialWordCount = completedChunks.reduce((sum, ch) => sum + ch.wordCount, 0);

        return {
          completeContent: partialContent,
          totalWordCount: partialWordCount,
          chunks: completedChunks,
          cutOffChunks,
          totalUsage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          },
        };
      }

      // Small delay between chunks to avoid rate limiting
      if (i < chunksToGenerate.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.data?.error || error?.message || 'Failed to generate chunk';
      const chunkLabel = hasChapters ? 'Chapter' : 'Section';
      
      // Report error progress
      if (options.onProgress) {
        options.onProgress({
          currentChunk: chunkNumber,
          totalChunks: chunksToGenerate.length,
          completedChunks: completedChunks.length,
          completedContent: previousChunksContent.join('\n\n'),
          isComplete: false,
          error: `Error generating ${chunkLabel} ${chunkNumber}: ${errorMessage}`,
        });
      }

      throw new Error(`Failed to generate ${chunkLabel} ${chunkNumber}: ${errorMessage}`);
    }
  }

  // Combine all chunks
  const chunkLabel = hasChapters ? 'Chapter' : 'Section';
  const completeContent = completedChunks
    .map((ch) => `# ${chunkLabel} ${ch.chunkNumber}: ${ch.chunkTitle}\n\n${ch.content}`)
    .join('\n\n');

  const totalWordCount = completedChunks.reduce((sum, ch) => sum + ch.wordCount, 0);

  // Report final progress
  if (options.onProgress) {
    options.onProgress({
      currentChunk: chunksToGenerate.length,
      totalChunks: chunksToGenerate.length,
      completedChunks: completedChunks.length,
      completedContent: completeContent,
      isComplete: true,
    });
  }

  return {
    completeContent,
    totalWordCount,
    chunks: completedChunks,
    cutOffChunks,
    totalUsage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
  };
}
