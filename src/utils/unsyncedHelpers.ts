/**
 * Helper functions to check for unsynced data
 */
import { getUnsyncedStories } from '../services/database/stories';
import { getUnsyncedCharacters } from '../services/database/characters';
import { getUnsyncedBlurbs } from '../services/database/blurbs';
import { getUnsyncedScenes } from '../services/database/scenes';
import { getUnsyncedChapters } from '../services/database/chapters';

/**
 * Check if there are any unsynced items for a user
 */
export const hasUnsyncedItems = async (userId: string): Promise<boolean> => {
  try {
    const [stories, characters, blurbs, scenes, chapters] = await Promise.all([
      getUnsyncedStories(userId),
      getUnsyncedCharacters(userId),
      getUnsyncedBlurbs(userId),
      getUnsyncedScenes(userId),
      getUnsyncedChapters(userId),
    ]);

    const totalUnsynced =
      stories.length +
      characters.length +
      blurbs.length +
      scenes.length +
      chapters.length;

    return totalUnsynced > 0;
  } catch (error) {
    console.error('Error checking unsynced items:', error);
    // If we can't check, assume there might be unsynced items to be safe
    return true;
  }
};

/**
 * Get count of unsynced items for a user
 */
export const getUnsyncedItemsCount = async (userId: string): Promise<number> => {
  try {
    const [stories, characters, blurbs, scenes, chapters] = await Promise.all([
      getUnsyncedStories(userId),
      getUnsyncedCharacters(userId),
      getUnsyncedBlurbs(userId),
      getUnsyncedScenes(userId),
      getUnsyncedChapters(userId),
    ]);

    return (
      stories.length +
      characters.length +
      blurbs.length +
      scenes.length +
      chapters.length
    );
  } catch (error) {
    console.error('Error counting unsynced items:', error);
    return 0;
  }
};
