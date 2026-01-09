/**
 * Sync Helper Functions
 * Utility functions for checking sync status
 */
import { getUnsyncedStories } from '../database/stories';
import { getUnsyncedCharacters } from '../database/characters';
import { getUnsyncedBlurbs } from '../database/blurbs';
import { getUnsyncedScenes } from '../database/scenes';
import { getUnsyncedChapters } from '../database/chapters';
import { syncQueueManager } from './queueManager';

/**
 * Check if there are any unsynced items
 * @param userId - User ID
 * @returns Object with counts of unsynced items and total count
 */
export async function checkUnsyncedItems(userId: string): Promise<{
  stories: number;
  characters: number;
  blurbs: number;
  scenes: number;
  chapters: number;
  queueItems: number;
  total: number;
}> {
  try {
    const [stories, characters, blurbs, scenes, chapters, queueSize] = await Promise.all([
      getUnsyncedStories(userId).then((items) => items.length),
      getUnsyncedCharacters(userId).then((items) => items.length),
      getUnsyncedBlurbs(userId).then((items) => items.length),
      getUnsyncedScenes(userId).then((items) => items.length),
      getUnsyncedChapters(userId).then((items) => items.length),
      syncQueueManager.size(),
    ]);

    const total = stories + characters + blurbs + scenes + chapters + queueSize;

    return {
      stories,
      characters,
      blurbs,
      scenes,
      chapters,
      queueItems: queueSize,
      total,
    };
  } catch (error) {
    console.error('Error checking unsynced items:', error);
    return {
      stories: 0,
      characters: 0,
      blurbs: 0,
      scenes: 0,
      chapters: 0,
      queueItems: 0,
      total: 0,
    };
  }
}
