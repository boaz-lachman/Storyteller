/**
 * Stories CRUD operations
 */
import { getDb } from './sqlite';
import { Story, StoryCreateInput, StoryUpdateInput, StoryPermission } from '../../types';
import { getCurrentTimestamp, generateId } from '../../utils/helpers';
import { getStoryPermission as getSharePermission } from './storyShares';

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
 * Get all stories for a user (owned + shared)
 */
export const getAllStories = async (userId: string): Promise<Story[]> => {
  const db = await getDb();
  
  // Get owned stories
  const ownedResults = await db.getAllAsync<Story>(
    'SELECT * FROM Stories WHERE userId = ? ORDER BY updatedAt DESC',
    [userId]
  );

  // Get shared stories
  const sharedResults = await db.getAllAsync<any>(
    `SELECT s.*, ss.permission as sharePermission, ss.ownerId as shareOwnerId
     FROM Stories s
     INNER JOIN StoryShares ss ON s.id = ss.storyId
     WHERE ss.sharedWithUserId = ?
     ORDER BY s.updatedAt DESC`,
    [userId]
  );

  // Process owned stories (mark as owner)
  const ownedStories = ownedResults.map((story) => {
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
      permission: 'owner' as StoryPermission,
    };
  }) as Story[];

  // Process shared stories
  const sharedStories = sharedResults.map((result) => {
    let cutOffChunks: number[] | undefined;
    if (result.cutOffChunks) {
      try {
        cutOffChunks = JSON.parse(result.cutOffChunks as string);
      } catch (e) {
        cutOffChunks = undefined;
      }
    }

    return {
      id: result.id,
      userId: result.shareOwnerId, // Use owner's userId for shared stories
      title: result.title,
      description: result.description,
      length: result.length,
      theme: result.theme,
      tone: result.tone,
      pov: result.pov,
      targetAudience: result.targetAudience,
      setting: result.setting,
      timePeriod: result.timePeriod,
      status: result.status,
      generatedContent: result.generatedContent,
      generatedAt: result.generatedAt,
      wordCount: result.wordCount,
      cutOffChunks,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      synced: !!result.synced,
      permission: (result.sharePermission === 'read-write' ? 'read-write' : 'read') as StoryPermission,
    };
  }) as Story[];

  // Combine and deduplicate (in case user both owns and has share access)
  const storyMap = new Map<string, Story>();
  
  // Add owned stories first (they take precedence)
  ownedStories.forEach((story) => {
    storyMap.set(story.id, story);
  });

  // Add shared stories only if not already owned
  sharedStories.forEach((story) => {
    if (!storyMap.has(story.id)) {
      storyMap.set(story.id, story);
    }
  });

  // Convert back to array and sort by updatedAt
  return Array.from(storyMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
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

/**
 * Get story with permission level for a user
 */
export const getStoryWithPermission = async (
  userId: string,
  storyId: string
): Promise<(Story & { permission: StoryPermission }) | null> => {
  const story = await getStory(storyId);
  if (!story) return null;

  const permission = await getSharePermission(userId, storyId);
  
  return {
    ...story,
    permission: permission || (story.userId === userId ? 'owner' : null),
  };
};
