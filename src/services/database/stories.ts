/**
 * Stories CRUD operations
 */
import { getDb } from './sqlite';
import { Story, StoryCreateInput, StoryUpdateInput } from '../../types';
import { getCurrentTimestamp, generateId } from '../../utils/helpers';

/**
 * Create a new story
 */
export const createStory = async (story: StoryCreateInput & { userId: string }): Promise<Story> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id =  story.id ?? generateId();

  const newStory: Story = {
    id,
    userId: story.userId,
    title: story.title,
    description: story.description,
    length: story.length,
    theme: story.theme,
    tone: story.tone,
    pov: story.pov,
    targetAudience: story.targetAudience,
    setting: story.setting,
    timePeriod: story.timePeriod,
    status: story.status || 'draft',
    generatedContent: story.generatedContent,
    generatedAt: story.generatedAt,
    wordCount: story.wordCount,
    cutOffChunks: story.cutOffChunks,
    createdAt: now,
    updatedAt: now,
    synced: story.synced ?? false,
  };

  await db.runAsync(
    `INSERT INTO Stories (
      id, userId, title, description, length, theme, tone, pov, targetAudience,
      setting, timePeriod, status, generatedContent, generatedAt, wordCount, cutOffChunks,
      createdAt, updatedAt, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newStory.id,
      newStory.userId,
      newStory.title,
      newStory.description || null,
      newStory.length,
      newStory.theme,
      newStory.tone,
      newStory.pov,
      newStory.targetAudience,
      newStory.setting || null,
      newStory.timePeriod || null,
      newStory.status,
      newStory.generatedContent || null,
      newStory.generatedAt || null,
      newStory.wordCount || null,
      newStory.cutOffChunks ? JSON.stringify(newStory.cutOffChunks) : null,
      newStory.createdAt,
      newStory.updatedAt,
      newStory.synced ? 1 : 0,
    ]
  );

  return newStory;
};

/**
 * Get a story by ID
 */
export const getStory = async (id: string): Promise<Story | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<Story>(
    'SELECT * FROM Stories WHERE id = ?',
    [id]
  );

  if (!result) return null;

  // Deserialize cutOffChunks from JSON
  let cutOffChunks: number[] | undefined;
  if (result.cutOffChunks) {
    try {
      cutOffChunks = JSON.parse(result.cutOffChunks as string);
    } catch (e) {
      cutOffChunks = undefined;
    }
  }

  return {
    ...result,
    cutOffChunks,
    synced: result.synced,
  } as Story;
};

/**
 * Get all stories for a user
 */
export const getAllStories = async (userId: string): Promise<Story[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<Story>(
    'SELECT * FROM Stories WHERE userId = ? ORDER BY updatedAt DESC',
    [userId]
  );

  return results.map((story) => {
    // Deserialize cutOffChunks from JSON
    let cutOffChunks: number[] | undefined;
    if (story.cutOffChunks) {
      try {
        cutOffChunks = JSON.parse(story.cutOffChunks as string);
      } catch (e) {
        cutOffChunks = undefined;
      }
    }

    return {
      ...story,
      cutOffChunks,
      synced: !!story.synced,
    };
  }) as Story[];
};

/**
 * Update a story
 */
export const updateStory = async (
  id: string,
  updates: StoryUpdateInput
): Promise<Story | null> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  // Build dynamic update query
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'userId') {
      fields.push(`${key} = ?`);
      // Serialize cutOffChunks array to JSON string
      if (key === 'cutOffChunks' && Array.isArray(value)) {
        values.push(value.length > 0 ? JSON.stringify(value) : null);
      } else {
        values.push(value);
      }
    }
  });

  if (fields.length === 0) {
    return getStory(id);
  }

  // Mark as unsynced when updated
  fields.push('synced = ?');
  values.push(0);
  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE Stories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getStory(id);
};

/**
 * Delete a story (hard delete)
 */
export const deleteStory = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM Stories WHERE id = ?', [id]);
};

/**
 * Get unsynced stories
 */
export const getUnsyncedStories = async (userId: string): Promise<Story[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<Story>(
    'SELECT * FROM Stories WHERE userId = ? AND synced = 0',
    [userId]
  );

  return results.map((story) => {
    // Deserialize cutOffChunks from JSON
    let cutOffChunks: number[] | undefined;
    if (story.cutOffChunks) {
      try {
        cutOffChunks = JSON.parse(story.cutOffChunks as string);
      } catch (e) {
        cutOffChunks = undefined;
      }
    }

    return {
      ...story,
      cutOffChunks,
      synced: !!story.synced,
    };
  }) as Story[];
};

/**
 * Mark story as synced
 */
export const markStorySynced = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('UPDATE Stories SET synced = 1 WHERE id = ?', [id]);
};
