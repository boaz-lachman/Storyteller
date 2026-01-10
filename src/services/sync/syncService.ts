/**
 * Sync Service
 * Handles synchronization between SQLite (local) and Firestore (remote)
 */
import { networkService } from '../network/networkService';
import { getCurrentTimestamp, retryWithBackoff } from '../../utils/helpers';

// SQLite imports
import {
  getAllStories,
  getUnsyncedStories,
  markStorySynced,
  createStory,
  updateStory,
  getStory,
} from '../database/stories';
import {
  getUnsyncedCharacters,
  getCharactersByStory,
  markCharacterSynced,
  createCharacter,
  updateCharacter,
  getCharacter,
} from '../database/characters';
import {
  getUnsyncedBlurbs,
  getBlurbsByStory,
  markBlurbSynced,
  createBlurb,
  updateBlurb,
  getBlurb,
} from '../database/blurbs';
import {
  getUnsyncedScenes,
  getScenesByStory,
  markSceneSynced,
  createScene,
  updateScene,
  getScene,
} from '../database/scenes';
import {
  getUnsyncedChapters,
  getChaptersByStory,
  markChapterSynced,
  createChapter,
  updateChapter,
  getChapter,
} from '../database/chapters';

// Firestore API imports
import { store } from '../../store';
import { firestoreApi } from '../../store/api/firestoreApi';
import { getLastIncrementalSyncTime, updateLastSyncTime } from '../database/syncMetadata';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: string[];
  duration: number;
}

type EntityType = 'story' | 'character' | 'blurb' | 'scene' | 'chapter' | 'generatedStory';

/**
 * Main sync function - orchestrates push and pull phases
 */
export const syncAll = async (userId: string): Promise<SyncResult> => {
  const startTime = getCurrentTimestamp();
  const errors: string[] = [];

  try {
    // Check if online
    const online = await networkService.isOnline();
    if (!online) {
      throw new Error('No network connection');
    }

    // Phase 1: Push local changes to Firestore
    const pushed = await pushUnsyncedChanges(userId);

    // Phase 2: Pull remote changes from Firestore
    const pulled = await pullRemoteChanges(userId);

    const duration = getCurrentTimestamp() - startTime;

    return {
      success: true,
      pushed,
      pulled,
      errors,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);

    return {
      success: false,
      pushed: 0,
      pulled: 0,
      errors,
      duration: getCurrentTimestamp() - startTime,
    };
  }
};

/**
 * Phase 1: Push unsynced local changes to Firestore
 * @param userId - User ID
 * @param sinceTimestamp - Optional timestamp to only sync entities changed after this time (for incremental sync)
 */
export const pushUnsyncedChanges = async (
  userId: string,
  sinceTimestamp?: number | null
): Promise<number> => {
  let pushedCount = 0;

  // Sync in dependency order
  const syncOrder: EntityType[] = [
    'story',
    'character',
    'blurb',
    'scene',
    'chapter',
    'generatedStory',
  ];

  for (const entityType of syncOrder) {
    try {
      const count = await syncEntityType(entityType, userId);
      pushedCount += count;
    } catch (error) {
      console.error(`Error syncing ${entityType}:`, error);
      // Continue with next entity type
    }
  }

  return pushedCount;
};

/**
 * Sync a specific entity type
 */
const syncEntityType = async (
  type: EntityType,
  userId: string
): Promise<number> => {
  let syncedCount = 0;

  switch (type) {
    case 'story':
      syncedCount = await syncStories(userId);
      break;
    case 'character':
      syncedCount = await syncCharacters(userId);
      break;
    case 'blurb':
      syncedCount = await syncBlurbs(userId);
      break;
    case 'scene':
      syncedCount = await syncScenes(userId);
      break;
    case 'chapter':
      syncedCount = await syncChapters(userId);
      break;
    case 'generatedStory':
      // Generated stories sync handled separately if needed
      break;
  }

  return syncedCount;
};

/**
 * Sync Stories
 */
const syncStories = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedStories(userId);
  let syncedCount = 0;

  for (const story of unsynced) {
    try {
      await retryWithBackoff(
        async () => {
        // Use uploadStory which handles both create and update
        const uploadResult = await store.dispatch(
          firestoreApi.endpoints.uploadStory.initiate(story)
        );
        if (!!uploadResult.error) {
          throw new Error('Failed to upload story to Firestore');
        }

        await markStorySynced(story.id);
        syncedCount++;
      }, 3, 1000); // 3 retries with 1s initial delay
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to sync story ${story.id}:`, errorMessage);
      // Add to queue for retry later
      // Use require to avoid circular dependency with queueManager
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { syncQueueManager } = require('./queueManager');
        await syncQueueManager.add('story', story.id, 'update');
      } catch (queueError) {
        console.error('Failed to add story to sync queue:', queueError);
      }
    }
  }

  return syncedCount;
};

/**
 * Sync Characters
 */
const syncCharacters = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedCharacters(userId);
  let syncedCount = 0;

  for (const character of unsynced) {
    try {
      await retryWithBackoff(
        async () => {
        if (character.deleted) {
          // For deleted characters, mark as deleted and upload
          // The firestore service should handle soft deletes
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadCharacter.initiate(character)
          );
          if (!!uploadResult.error) {
            throw new Error('Failed to delete character in Firestore');
          }
        } else {
          // Use uploadCharacter which handles both create and update
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadCharacter.initiate(character)
          );
          if (!!uploadResult.error) {
            throw new Error('Failed to sync character in Firestore');
          }
        }

        await markCharacterSynced(character.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync character ${character.id}:`, error);
      // Use require to avoid circular dependency with queueManager
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { syncQueueManager } = require('./queueManager');
      syncQueueManager.add('character', character.id, character.deleted ? 'delete' : 'update');
    }
  }

  return syncedCount;
};

/**
 * Sync Blurbs
 */
const syncBlurbs = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedBlurbs(userId);
  let syncedCount = 0;

  for (const blurb of unsynced) {
    try {
      await retryWithBackoff(
        async () => {
        const uploadResult = await store.dispatch(
          firestoreApi.endpoints.uploadBlurb.initiate(blurb)
        );
        if (!!uploadResult.error) {
          throw new Error('Failed to upload blurb to Firestore');
        }
        await markBlurbSynced(blurb.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync blurb ${blurb.id}:`, error);
      // Use require to avoid circular dependency with queueManager
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { syncQueueManager } = require('./queueManager');
      syncQueueManager.add('blurb', blurb.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Sync Scenes
 */
const syncScenes = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedScenes(userId);
  let syncedCount = 0;

  for (const scene of unsynced) {
    try {
      await retryWithBackoff(
        async () => {
        const uploadResult = await store.dispatch(
          firestoreApi.endpoints.uploadScene.initiate(scene)
        );
        if (!!uploadResult.error) {
          throw new Error('Failed to upload scene to Firestore');
        }
        await markSceneSynced(scene.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync scene ${scene.id}:`, error);
      // Use require to avoid circular dependency with queueManager
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { syncQueueManager } = require('./queueManager');
      syncQueueManager.add('scene', scene.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Sync Chapters
 */
const syncChapters = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedChapters(userId);
  let syncedCount = 0;

  for (const chapter of unsynced) {
    try {
      await retryWithBackoff(
        async () => {
        const uploadResult = await store.dispatch(
          firestoreApi.endpoints.uploadChapter.initiate(chapter)
        );
        if (!!uploadResult.error) {
          throw new Error('Failed to upload chapter to Firestore');
        }
        await markChapterSynced(chapter.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync chapter ${chapter.id}:`, error);
      // Use require to avoid circular dependency with queueManager
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { syncQueueManager } = require('./queueManager');
      syncQueueManager.add('chapter', chapter.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Phase 2: Pull remote changes from Firestore
 * @param userId - User ID
 * @param sinceTimestamp - Optional timestamp to only pull entities changed after this time (for incremental sync)
 */
export const pullRemoteChanges = async (
  userId: string,
  sinceTimestamp?: number | null
): Promise<number> => {
  let pulledCount = 0;

  try {
    // Track story IDs that need entity downloads (both newly pulled and existing)
    const storiesToSyncEntities = new Set<string>();
    
    // Pull stories using downloadStories
    const storiesResult = await store.dispatch(
      firestoreApi.endpoints.downloadStories.initiate(userId)
    );
    if (storiesResult.data) {
      for (const remoteStory of storiesResult.data) {
        const localStory = await getStory(remoteStory.id);
        
        // Always mark story for entity sync (regardless of timestamp or status)
        // This ensures entities for completed stories are also pulled
        storiesToSyncEntities.add(remoteStory.id);
        
        // Filter by timestamp if incremental sync (only for story update, not entity download)
        if (sinceTimestamp && remoteStory.updatedAt <= sinceTimestamp) {
          // Story hasn't changed, but still download entities in case they were updated
          continue; // Skip story update, but entities will still be downloaded below
        }

        if (!localStory) {
          // New story from remote, create locally and mark as synced
          // Entities from Firestore are already synced, so mark them as such
          await createStory(remoteStory);
          await markStorySynced(remoteStory.id);
          pulledCount++;
        } else {
          // Resolve conflict using Last-Write-Wins
          // If local entity is already synced and remote is newer, always use remote
          const shouldUseRemote = localStory.synced 
            ? remoteStory.updatedAt > localStory.updatedAt
            : resolveConflict(localStory, remoteStory) === remoteStory || remoteStory.updatedAt > localStory.updatedAt;
          
          if (shouldUseRemote) {
            // Remote is newer or local is synced and remote is newer, update local and mark as synced
            await updateStory(remoteStory.id, remoteStory as any);
            await markStorySynced(remoteStory.id);
            pulledCount++;
          }
          // If local is newer and unsynced, it will be pushed in next sync
        }
      }
    }

    // Pull entities for each story using downloadEntitiesForStory
    // Use both remote stories (from Firestore) and local stories to ensure all stories are covered
    const localStories = await getAllStories(userId);
    
    // Add all local story IDs to the set (including completed stories)
    for (const story of localStories) {
      storiesToSyncEntities.add(story.id);
    }
    
    // Download entities for all stories (both pulled and existing, including completed ones)
    for (const storyId of storiesToSyncEntities) {
      // Get the story to ensure it exists (may have been pulled or already local)
      const story = await getStory(storyId);
      if (!story) {
        // Story doesn't exist locally, skip
        continue;
      }
      
      // Get all local entities for this story (for conflict resolution)
      const storyCharacters = await getCharactersByStory(storyId);
      const storyBlurbs = await getBlurbsByStory(storyId);
      const storyScenes = await getScenesByStory(storyId);
      const storyChapters = await getChaptersByStory(storyId);

      // Download all entities for this story (including completed stories)
      const entitiesResult = await store.dispatch(
        firestoreApi.endpoints.downloadEntitiesForStory.initiate({
          storyId,
          localEntities: {
            characters: storyCharacters,
            blurbs: storyBlurbs,
            scenes: storyScenes,
            chapters: storyChapters,
          },
        })
      );

      if (entitiesResult.data) {
        // Track remote entity IDs to detect deletions
        const remoteCharacterIds = new Set<string>();
        const remoteBlurbIds = new Set<string>();
        const remoteSceneIds = new Set<string>();
        const remoteChapterIds = new Set<string>();
        
        // Process characters
        for (const remoteChar of entitiesResult.data.characters || []) {
          // Always track remote entity IDs to detect deletions, regardless of timestamp
          remoteCharacterIds.add(remoteChar.id);
          
          // Filter by timestamp if incremental sync (skip update but still track for deletion check)
          if (sinceTimestamp && remoteChar.updatedAt <= sinceTimestamp) {
            continue;
          }
          const localChar = await getCharacter(remoteChar.id);
          if (!localChar) {
            // New character from remote, create locally and mark as synced
            await createCharacter(remoteChar);
            await markCharacterSynced(remoteChar.id);
            pulledCount++;
          } else {
            // Resolve conflict using Last-Write-Wins
            // If local entity is already synced and remote is newer, always use remote
            const shouldUseRemote = localChar.synced 
              ? remoteChar.updatedAt > localChar.updatedAt
              : resolveConflict(localChar, remoteChar) === remoteChar || remoteChar.updatedAt > localChar.updatedAt;
            
            if (shouldUseRemote) {
              // Remote is newer or local is synced and remote is newer, update local and mark as synced
              await updateCharacter(remoteChar.id, remoteChar as any);
              await markCharacterSynced(remoteChar.id);
              pulledCount++;
            }
            // If local is newer and unsynced, it will be pushed in next sync
          }
        }
        
        // Delete local characters that don't exist in remote (were deleted in Firestore)
        // Only delete if they're synced (local changes take precedence)
        for (const localChar of storyCharacters) {
          if (!localChar.deleted && !remoteCharacterIds.has(localChar.id) && localChar.synced) {
            // Character was deleted remotely, delete locally
            const { deleteCharacter } = require('../database/characters');
            await deleteCharacter(localChar.id);
            pulledCount++;
            console.log(`Deleted local character ${localChar.id} - removed from Firestore`);
          }
        }

        // Process blurbs
        for (const remoteBlurb of entitiesResult.data.blurbs || []) {
          // Always track remote entity IDs to detect deletions, regardless of timestamp
          remoteBlurbIds.add(remoteBlurb.id);
          
          // Filter by timestamp if incremental sync (skip update but still track for deletion check)
          if (sinceTimestamp && remoteBlurb.updatedAt <= sinceTimestamp) {
            continue;
          }
          const localBlurb = await getBlurb(remoteBlurb.id);
          if (!localBlurb) {
            // New blurb from remote, create locally and mark as synced
            await createBlurb(remoteBlurb);
            await markBlurbSynced(remoteBlurb.id);
            pulledCount++;
          } else {
            // Resolve conflict using Last-Write-Wins
            // If local entity is already synced and remote is newer, always use remote
            const shouldUseRemote = localBlurb.synced 
              ? remoteBlurb.updatedAt > localBlurb.updatedAt
              : resolveConflict(localBlurb, remoteBlurb) === remoteBlurb || remoteBlurb.updatedAt > localBlurb.updatedAt;
            
            if (shouldUseRemote) {
              // Remote is newer or local is synced and remote is newer, update local and mark as synced
              await updateBlurb(remoteBlurb.id, remoteBlurb as any);
              await markBlurbSynced(remoteBlurb.id);
              pulledCount++;
            }
            // If local is newer and unsynced, it will be pushed in next sync
          }
        }
        
        // Delete local blurbs that don't exist in remote (were deleted in Firestore)
        // Only delete if they're synced (local changes take precedence)
        for (const localBlurb of storyBlurbs) {
          if (!localBlurb.deleted && !remoteBlurbIds.has(localBlurb.id) && localBlurb.synced) {
            // Blurb was deleted remotely, delete locally
            const { deleteBlurb } = require('../database/blurbs');
            await deleteBlurb(localBlurb.id);
            pulledCount++;
            console.log(`Deleted local blurb ${localBlurb.id} - removed from Firestore`);
          }
        }

        // Process scenes
        for (const remoteScene of entitiesResult.data.scenes || []) {
          // Always track remote entity IDs to detect deletions, regardless of timestamp
          remoteSceneIds.add(remoteScene.id);
          
          // Filter by timestamp if incremental sync (skip update but still track for deletion check)
          if (sinceTimestamp && remoteScene.updatedAt <= sinceTimestamp) {
            continue;
          }
          const localScene = await getScene(remoteScene.id);
          if (!localScene) {
            // New scene from remote, create locally and mark as synced
            await createScene(remoteScene);
            await markSceneSynced(remoteScene.id);
            pulledCount++;
          } else {
            // Resolve conflict using Last-Write-Wins
            // If local entity is already synced and remote is newer, always use remote
            const shouldUseRemote = localScene.synced 
              ? remoteScene.updatedAt > localScene.updatedAt
              : resolveConflict(localScene, remoteScene) === remoteScene || remoteScene.updatedAt > localScene.updatedAt;
            
            if (shouldUseRemote) {
              // Remote is newer or local is synced and remote is newer, update local and mark as synced
              await updateScene(remoteScene.id, remoteScene as any);
              await markSceneSynced(remoteScene.id);
              pulledCount++;
            }
            // If local is newer and unsynced, it will be pushed in next sync
          }
        }
        
        // Delete local scenes that don't exist in remote (were deleted in Firestore)
        // Only delete if they're synced (local changes take precedence)
        for (const localScene of storyScenes) {
          if (!localScene.deleted && !remoteSceneIds.has(localScene.id) && localScene.synced) {
            // Scene was deleted remotely, delete locally
            const { deleteScene } = require('../database/scenes');
            await deleteScene(localScene.id);
            pulledCount++;
            console.log(`Deleted local scene ${localScene.id} - removed from Firestore`);
          }
        }

        // Process chapters
        for (const remoteChapter of entitiesResult.data.chapters || []) {
          // Always track remote entity IDs to detect deletions, regardless of timestamp
          remoteChapterIds.add(remoteChapter.id);
          
          // Filter by timestamp if incremental sync (skip update but still track for deletion check)
          if (sinceTimestamp && remoteChapter.updatedAt <= sinceTimestamp) {
            continue;
          }
          const localChapter = await getChapter(remoteChapter.id);
          if (!localChapter) {
            // New chapter from remote, create locally and mark as synced
            await createChapter(remoteChapter);
            await markChapterSynced(remoteChapter.id);
            pulledCount++;
          } else {
            // Resolve conflict using Last-Write-Wins
            // If local entity is already synced and remote is newer, always use remote
            const shouldUseRemote = localChapter.synced 
              ? remoteChapter.updatedAt > localChapter.updatedAt
              : resolveConflict(localChapter, remoteChapter) === remoteChapter || remoteChapter.updatedAt > localChapter.updatedAt;
            
            if (shouldUseRemote) {
              // Remote is newer or local is synced and remote is newer, update local and mark as synced
              await updateChapter(remoteChapter.id, remoteChapter as any);
              await markChapterSynced(remoteChapter.id);
              pulledCount++;
            }
            // If local is newer and unsynced, it will be pushed in next sync
          }
        }
        
        // Delete local chapters that are marked as deleted in Firestore
        const deletedChapterIds = entitiesResult.data.deletedChapters || [];
        for (const deletedChapterId of deletedChapterIds) {
          const localChapter = await getChapter(deletedChapterId);
          if (localChapter) {
            // Chapter is marked as deleted in Firestore, hard delete from local DB
            const { deleteChapter } = require('../database/chapters');
            await deleteChapter(deletedChapterId);
            pulledCount++;
            console.log(`Hard deleted local chapter ${deletedChapterId} - marked as deleted in Firestore`);
          }
        }
        
        // Delete local chapters that don't exist in remote (were deleted in Firestore)
        // Only delete if they're synced (local changes take precedence)
        for (const localChapter of storyChapters) {
          if (!localChapter.deleted && !remoteChapterIds.has(localChapter.id) && localChapter.synced) {
            // Chapter was deleted remotely (no longer exists), delete locally
            const { deleteChapter } = require('../database/chapters');
            await deleteChapter(localChapter.id);
            pulledCount++;
            console.log(`Deleted local chapter ${localChapter.id} - removed from Firestore`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error pulling remote changes:', error);
    throw error;
  }

  return pulledCount;
};

/**
 * Resolve conflict between local and remote entity
 * Uses Last-Write-Wins (LWW) strategy with improved error handling
 */
export const resolveConflict = <T extends { updatedAt: number }>(
  local: T,
  remote: T
): T => {
  try {
    if (!local || !remote) {
      // If one is missing, return the one that exists
      return remote || local;
    }

    // If timestamps are equal or very close (within 1 second), prefer remote for consistency
    const timeDiff = remote.updatedAt - local.updatedAt;
    if (timeDiff >= 0) {
      return remote; // Remote is newer or equal
    }
    return local; // Local is newer
  } catch (error) {
    console.error('Error resolving conflict:', error);
    // On error, default to remote (safer for multi-device sync)
    return remote || local;
  }
};

/**
 * Incremental sync - only sync entities changed since last sync
 */
export const incrementalSync = async (userId: string): Promise<SyncResult> => {
  const startTime = getCurrentTimestamp();
  const errors: string[] = [];

  try {
    // Check if online
    const online = await networkService.isOnline();
    if (!online) {
      throw new Error('No network connection');
    }

    // Get last sync time
    const lastSyncTime = await getLastIncrementalSyncTime(userId);

    // Phase 1: Push unsynced local changes (only those changed since last sync or never synced)
    const pushed = await pushUnsyncedChanges(userId, lastSyncTime);

    // Phase 2: Pull remote changes (only those changed since last sync)
    const pulled = await pullRemoteChanges(userId, lastSyncTime);

    // Update last sync time
    await updateLastSyncTime(userId, startTime);

    const duration = getCurrentTimestamp() - startTime;

    return {
      success: true,
      pushed,
      pulled,
      errors,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);

    return {
      success: false,
      pushed: 0,
      pulled: 0,
      errors,
      duration: getCurrentTimestamp() - startTime,
    };
  }
};
