/**
 * Scenes CRUD operations
 */
import { getDb } from './sqlite';
import { Scene, SceneCreateInput, SceneUpdateInput } from '../../types';
import { getCurrentTimestamp, generateId, safeJsonStringify, safeJsonParse } from '../../utils/helpers';
import { canEditEntity } from '../../utils/permissions';

/**
 * Create a new scene
 */
export const createScene = async (
  scene: SceneCreateInput & { userId: string; storyId: string }
): Promise<Scene> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id = scene.id ?? generateId();

  const newScene: Scene = {
    id,
    userId: scene.userId,
    storyId: scene.storyId,
    title: scene.title,
    description: scene.description,
    setting: scene.setting,
    characters: scene.characters || [],
    mood: scene.mood,
    conflictLevel: scene.conflictLevel,
    importance: scene.importance,
    createdAt: now,
    updatedAt: now,
    synced: scene.synced ?? false,
    deleted: false,
  };

  await db.runAsync(
    `INSERT INTO Scenes (
      id, userId, storyId, title, description, setting, characters,
      mood, conflictLevel, importance, createdAt, updatedAt, synced, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newScene.id,
      newScene.userId,
      newScene.storyId,
      newScene.title,
      newScene.description,
      newScene.setting,
      safeJsonStringify(newScene.characters),
      newScene.mood || null,
      newScene.conflictLevel || null,
      newScene.importance,
      newScene.createdAt,
      newScene.updatedAt,
      newScene.synced ? 1 : 0,
      newScene.deleted ? 1 : 0,
    ]
  );

  return newScene;
};

/**
 * Get a scene by ID
 */
export const getScene = async (id: string): Promise<Scene | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM Scenes WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!result) return null;

  return {
    ...result,
    characters: safeJsonParse(result.characters, []),
    synced: result.synced === 1,
    deleted: result.deleted === 1,
  } as Scene;
};

/**
 * Get all scenes for a story
 */
export const getScenesByStory = async (
  storyId: string,
  sortBy: 'importance' | 'createdAt' = 'importance',
  order: 'ASC' | 'DESC' = 'DESC'
): Promise<Scene[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<any>(
    `SELECT * FROM Scenes 
     WHERE storyId = ? AND deleted = 0 
     ORDER BY ${sortBy} ${order}`,
    [storyId]
  );

  return results.map((scene) => ({
    ...scene,
    characters: safeJsonParse(scene.characters, []),
    synced: scene.synced === 1,
    deleted: scene.deleted === 1,
  })) as Scene[];
};

/**
 * Update a scene
 */
export const updateScene = async (
  id: string,
  updates: SceneUpdateInput,
  options?: {
    userId?: string; // Optional: if provided, will check permissions
    preserveSync?: boolean; // If true, don't mark as unsynced
    useRemoteUpdatedAt?: number; // If provided, use this timestamp instead of current time
  }
): Promise<Scene | null> => {
  // Check permissions if userId is provided
  if (options?.userId) {
    const scene = await getScene(id);
    if (!scene) {
      throw new Error('Scene not found');
    }
    const canEdit = await canEditEntity(options.userId, scene);
    if (!canEdit) {
      throw new Error('You do not have permission to edit this scene');
    }
  }

  const db = await getDb();
  const now = getCurrentTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'userId' && key !== 'storyId' && key !== 'updatedAt') {
      if (key === 'characters' && Array.isArray(value)) {
        fields.push(`${key} = ?`);
        values.push(safeJsonStringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });

  if (fields.length === 0) {
    return getScene(id);
  }

  // Mark as unsynced when updated (unless preserveSync is true)
  if (!options?.preserveSync) {
    fields.push('synced = ?');
    values.push(0);
  }

  // Use remote updatedAt if provided, otherwise use current time
  fields.push('updatedAt = ?');
  values.push(options?.useRemoteUpdatedAt ?? now);
  values.push(id);

  await db.runAsync(
    `UPDATE Scenes SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getScene(id);
};

/**
 * Delete a scene (soft delete)
 */
export const deleteScene = async (
  id: string,
  userId?: string // Optional: if provided, will check permissions
): Promise<void> => {
  // Check permissions if userId is provided
  if (userId) {
    const scene = await getScene(id);
    if (!scene) {
      throw new Error('Scene not found');
    }
    const canDelete = await canEditEntity(userId, scene);
    if (!canDelete) {
      throw new Error('You do not have permission to delete this scene');
    }
  }

  const db = await getDb();
  const now = getCurrentTimestamp();
  await db.runAsync(
    'UPDATE Scenes SET deleted = 1, updatedAt = ? WHERE id = ?',
    [now, id]
  );
};

/**
 * Get unsynced scenes
 */
export const getUnsyncedScenes = async (userId: string): Promise<Scene[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM Scenes WHERE userId = ? AND synced = 0 AND deleted = 0',
    [userId]
  );

  return results.map((scene) => ({
    ...scene,
    characters: safeJsonParse(scene.characters, []),
    synced: scene.synced === 1,
    deleted: scene.deleted === 1,
  })) as Scene[];
};

/**
 * Mark scene as synced
 */
export const markSceneSynced = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('UPDATE Scenes SET synced = 1 WHERE id = ?', [id]);
};

/**
 * Get multiple scenes by IDs (batch query for sync performance)
 * Returns a Map for O(1) lookup
 */
export const getScenesByIds = async (ids: string[]): Promise<Map<string, Scene>> => {
  if (ids.length === 0) {
    return new Map();
  }

  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  const results = await db.getAllAsync<any>(
    `SELECT * FROM Scenes WHERE id IN (${placeholders}) AND deleted = 0`,
    ids
  );

  const scenesMap = new Map<string, Scene>();
  results.forEach((scene) => {
    scenesMap.set(scene.id, {
      ...scene,
      characters: safeJsonParse(scene.characters, []),
      synced: scene.synced === 1,
      deleted: scene.deleted === 1,
    } as Scene);
  });

  return scenesMap;
};
