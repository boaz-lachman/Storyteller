/**
 * Hook for calculating story statistics
 * Counts characters, blurbs, scenes, chapters and calculates progress
 */
import { useMemo } from 'react';
import { 
  getCharactersByStory, 
  getBlurbsByStory, 
  getScenesByStory, 
  getChaptersByStory 
} from '../services/database';
import type { Story } from '../types';

export interface StoryStatistics {
  characterCount: number;
  blurbCount: number;
  sceneCount: number;
  chapterCount: number;
}

/**
 * Calculate story statistics
 * @param storyId - The story ID
 * @param story - The story object (optional, for progress calculation)
 * @returns Promise with statistics
 */
export const calculateStoryStatistics = async (
  storyId: string,
  story?: Story
): Promise<StoryStatistics> => {
  try {
    // Fetch all entities sequentially to avoid SQLite concurrent access issues
    // Running queries in parallel can cause "Cannot use shared object that was already released" errors
    const characters = await getCharactersByStory(storyId);
    const blurbs = await getBlurbsByStory(storyId);
    const scenes = await getScenesByStory(storyId);
    const chapters = await getChaptersByStory(storyId);

    const characterCount = characters.length;
    const blurbCount = blurbs.length;
    const sceneCount = scenes.length;
    const chapterCount = chapters.length;

    return {
      characterCount,
      blurbCount,
      sceneCount,
      chapterCount,
    };
  } catch (error) {
    console.error('Error in calculateStoryStatistics:', error);
    // Return default values on error
    return {
      characterCount: 0,
      blurbCount: 0,
      sceneCount: 0,
      chapterCount: 0,
    };
  }
};

/**
 * React hook for story statistics
 * Note: This hook doesn't fetch data automatically - use with useEffect or similar
 */
export const useStoryStatistics = (
  statistics: StoryStatistics | null
): StoryStatistics | null => {
  return useMemo(() => statistics, [statistics]);
};
