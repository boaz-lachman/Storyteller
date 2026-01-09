/**
 * Sync Service
 * Handles synchronization between SQLite (local) and Firestore (remote)
 */
import { isOnline } from '../../utils/networkHelpers';
import { getCurrentTimestamp, retryWithBackoff } from '../../utils/helpers';
import { syncQueueManager } from './queueManager';
import { setSyncing, setLastSyncTime, setSyncError } from '../../store/slices/syncSlice';

// SQLite imports
import {
  getAllStories,
  getUnsyncedStories,
  markStorySynced,
  createStory,
  updateStory,
  getStory,
  getStoryByFirestoreId,
} from '../database/stories';
import {
  getUnsyncedCharacters,
  markCharacterSynced,
  createCharacter,
  updateCharacter,
  getCharacter,
} from '../database/characters';
import {
  getUnsyncedBlurbs,
  markBlurbSynced,
  createBlurb,
  updateBlurb,
  getBlurb,
} from '../database/blurbs';
import {
  getUnsyncedScenes,
  markSceneSynced,
  createScene,
  updateScene,
  getScene,
} from '../database/scenes';
import {
  getUnsyncedChapters,
  markChapterSynced,
  createChapter,
  updateChapter,
  getChapter,
} from '../database/chapters';

// Firestore API imports
import { firestoreApi } from '../../store/api/firestoreApi';
import { store } from '../../store';
// RTK Query API imports for cache invalidation
import { storiesApi } from '../../store/api/storiesApi';
import { charactersApi } from '../../store/api/charactersApi';
import { blurbsApi } from '../../store/api/blurbsApi';
import { scenesApi } from '../../store/api/scenesApi';
import { chaptersApi } from '../../store/api/chaptersApi';

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
 * @param userId - User ID
 * @param incremental - If true, only sync entities changed since last sync (default: true)
 */
export const syncAll = async (
  userId: string,
  incremental: boolean = true
): Promise<SyncResult> => {
  const startTime = getCurrentTimestamp();
  const errors: string[] = [];

  try {
    // Set syncing state
    store.dispatch(setSyncing(true));
    store.dispatch(setSyncError(null));

    // Check if online
    const online = await isOnline();
    if (!online) {
      throw new Error('No network connection');
    }

    // Get last sync time for incremental sync
    const state = store.getState();
    const lastSyncTime = incremental ? state.sync.lastSyncTime : null;

    // Phase 1: Push local changes to Firestore
    const pushed = await pushUnsyncedChanges(userId, lastSyncTime);

    // Phase 2: Pull remote changes from Firestore
    const pulled = await pullRemoteChanges(userId, lastSyncTime);

    const duration = getCurrentTimestamp() - startTime;
    const endTime = getCurrentTimestamp();

    // Update last sync time
    store.dispatch(setLastSyncTime(endTime));
    store.dispatch(setSyncing(false));

    // Invalidate all RTK Query caches to refresh pages after sync
    // This ensures all queries refetch with the latest synced data
    store.dispatch(storiesApi.util.invalidateTags(['Story']));
    store.dispatch(charactersApi.util.invalidateTags(['Character']));
    store.dispatch(blurbsApi.util.invalidateTags(['Blurb']));
    store.dispatch(scenesApi.util.invalidateTags(['Scene']));
    store.dispatch(chaptersApi.util.invalidateTags(['Chapter']));

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

    // Update error state
    store.dispatch(setSyncError(errorMessage));
    store.dispatch(setSyncing(false));

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
 * @param lastSyncTime - Optional timestamp to only sync entities changed since this time (incremental sync)
 */
export const pushUnsyncedChanges = async (
  userId: string,
  lastSyncTime?: number | null
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
      const count = await syncEntityType(entityType, userId, lastSyncTime);
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
 * @param type - Entity type to sync
 * @param userId - User ID
 * @param lastSyncTime - Optional timestamp for incremental sync
 */
const syncEntityType = async (
  type: EntityType,
  userId: string,
  lastSyncTime?: number | null
): Promise<number> => {
  let syncedCount = 0;

  switch (type) {
    case 'story':
      syncedCount = await syncStories(userId, lastSyncTime);
      break;
    case 'character':
      syncedCount = await syncCharacters(userId, lastSyncTime);
      break;
    case 'blurb':
      syncedCount = await syncBlurbs(userId, lastSyncTime);
      break;
    case 'scene':
      syncedCount = await syncScenes(userId, lastSyncTime);
      break;
    case 'chapter':
      syncedCount = await syncChapters(userId, lastSyncTime);
      break;
    case 'generatedStory':
      // Generated stories sync handled separately if needed
      break;
  }

  return syncedCount;
};

/**
 * Sync Stories
 * @param userId - User ID
 * @param lastSyncTime - Optional timestamp for incremental sync
 */
const syncStories = async (userId: string, lastSyncTime?: number | null): Promise<number> => {
  const unsynced = await getUnsyncedStories(userId);
  
  // Filter by lastSyncTime for incremental sync
  const toSync = lastSyncTime
    ? unsynced.filter((story) => !story.synced || story.updatedAt > lastSyncTime)
    : unsynced;
  
  let syncedCount = 0;

  for (const story of toSync) {
    try {
      await retryWithBackoff(async () => {
        // Try to get story from Firestore first
        let storyExists = false;
        try {
          const getResult = await store.dispatch(
            firestoreApi.endpoints.getStory.initiate({
              userId: story.userId,
              id: story.id,
            })
          );
          storyExists = !getResult.isError;
        } catch {
          storyExists = false;
        }

        let firestoreId: string | undefined;
        
        if (storyExists) {
          // Update existing story - use firestoreId if available, otherwise use local id
          const firestoreDocId = story.firestoreId || story.id;
          const updateResult = await store.dispatch(
            firestoreApi.endpoints.updateStory.initiate({
              userId: story.userId,
              id: firestoreDocId,
              data: story,
            })
          );
          if (!!updateResult.error) {
            throw new Error('Failed to update story in Firestore');
          }
          firestoreId = firestoreDocId;
        } else {
          // Create new story
          const createResult = await store.dispatch(
            firestoreApi.endpoints.createStory.initiate(story)
          );
          if (!!createResult.error) {
            throw new Error('Failed to create story in Firestore');
          }
          // Get the firestoreId from the result (it should be the document ID)
          firestoreId = createResult.data?.id || story.id;
        }

        // Update local story with firestoreId if it was set
        if (firestoreId && firestoreId !== story.firestoreId) {
          await updateStory(story.id, { firestoreId });
        }

        await markStorySynced(story.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync story ${story.id}:`, error);
      await syncQueueManager.add('story', story.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Sync Characters
 * @param userId - User ID
 * @param lastSyncTime - Optional timestamp for incremental sync
 */
const syncCharacters = async (userId: string, lastSyncTime?: number | null): Promise<number> => {
  const unsynced = await getUnsyncedCharacters(userId);
  
  // Filter by lastSyncTime for incremental sync
  const toSync = lastSyncTime
    ? unsynced.filter((character) => !character.synced || character.updatedAt > lastSyncTime)
    : unsynced;
  
  let syncedCount = 0;

  for (const character of toSync) {
    try {
      await retryWithBackoff(async () => {
        if (character.deleted) {
          // Handle delete
          const deleteResult = await store.dispatch(
            firestoreApi.endpoints.deleteCharacter.initiate({
              userId: character.userId,
              storyId: character.storyId,
              id: character.id,
            })
          );
          if (!!deleteResult.error) {
            throw new Error('Failed to delete character in Firestore');
          }
        } else {
          // Try create first, if exists then update
          const createResult = await store.dispatch(
            firestoreApi.endpoints.createCharacter.initiate(character)
          );
          
          if (!!createResult.error) {
            // Might already exist, try update
            const updateResult = await store.dispatch(
              firestoreApi.endpoints.updateCharacter.initiate({
                userId: character.userId,
                storyId: character.storyId,
                id: character.id,
                data: character,
              })
            );
            if (!!updateResult.error) {
              throw new Error('Failed to sync character in Firestore');
            }
          }
        }

        await markCharacterSynced(character.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync character ${character.id}:`, error);
      await syncQueueManager.add('character', character.id, character.deleted ? 'delete' : 'update');
    }
  }

  return syncedCount;
};

/**
 * Sync Blurbs
 * @param userId - User ID
 * @param lastSyncTime - Optional timestamp for incremental sync
 */
const syncBlurbs = async (userId: string, lastSyncTime?: number | null): Promise<number> => {
  const unsynced = await getUnsyncedBlurbs(userId);
  
  // Filter by lastSyncTime for incremental sync
  const toSync = lastSyncTime
    ? unsynced.filter((blurb) => !blurb.synced || blurb.updatedAt > lastSyncTime)
    : unsynced;
  
  let syncedCount = 0;

  for (const blurb of toSync) {
    try {
      await retryWithBackoff(async () => {
        const createResult = await store.dispatch(
          firestoreApi.endpoints.createBlurb.initiate(blurb)
        );
        if (!!createResult.error) {
          throw new Error('Failed to create blurb in Firestore');
        }
        await markBlurbSynced(blurb.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync blurb ${blurb.id}:`, error);
      await syncQueueManager.add('blurb', blurb.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Sync Scenes
 * @param userId - User ID
 * @param lastSyncTime - Optional timestamp for incremental sync
 */
const syncScenes = async (userId: string, lastSyncTime?: number | null): Promise<number> => {
  const unsynced = await getUnsyncedScenes(userId);
  
  // Filter by lastSyncTime for incremental sync
  const toSync = lastSyncTime
    ? unsynced.filter((scene) => !scene.synced || scene.updatedAt > lastSyncTime)
    : unsynced;
  
  let syncedCount = 0;

  for (const scene of toSync) {
    try {
      await retryWithBackoff(async () => {
        const createResult = await store.dispatch(
          firestoreApi.endpoints.createScene.initiate(scene)
        );
        if (!!createResult.error) {
          throw new Error('Failed to create scene in Firestore');
        }
        await markSceneSynced(scene.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync scene ${scene.id}:`, error);
      await syncQueueManager.add('scene', scene.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Sync Chapters
 * @param userId - User ID
 * @param lastSyncTime - Optional timestamp for incremental sync
 */
const syncChapters = async (userId: string, lastSyncTime?: number | null): Promise<number> => {
  const unsynced = await getUnsyncedChapters(userId);
  
  // Filter by lastSyncTime for incremental sync
  const toSync = lastSyncTime
    ? unsynced.filter((chapter) => !chapter.synced || chapter.updatedAt > lastSyncTime)
    : unsynced;
  
  let syncedCount = 0;

  for (const chapter of toSync) {
    try {
      await retryWithBackoff(async () => {
        const createResult = await store.dispatch(
          firestoreApi.endpoints.createChapter.initiate(chapter)
        );
        if (!!createResult.error) {
          throw new Error('Failed to create chapter in Firestore');
        }
        await markChapterSynced(chapter.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync chapter ${chapter.id}:`, error);
      await syncQueueManager.add('chapter', chapter.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Phase 2: Pull remote changes from Firestore
 * @param userId - User ID
 * @param lastSyncTime - Optional timestamp for incremental sync
 */
export const pullRemoteChanges = async (
  userId: string,
  lastSyncTime?: number | null
): Promise<number> => {
  let pulledCount = 0;

  try {
    // Pull stories
    const storiesResult = await store.dispatch(
      firestoreApi.endpoints.listStories.initiate({ userId })
    );
    if (storiesResult.data) {
      for (const remoteStory of storiesResult.data) {
        // Try to find local story by firestoreId first, then by id
        let localStory = remoteStory.firestoreId 
          ? await getStoryByFirestoreId(remoteStory.firestoreId)
          : null;
        
        if (!localStory) {
          localStory = await getStory(remoteStory.id);
        }
        
        if (!localStory) {
          // New story from remote, create locally with firestoreId set
          await createStory({ ...remoteStory, firestoreId: remoteStory.firestoreId || remoteStory.id });
          pulledCount++;
        } else if (remoteStory.updatedAt > localStory.updatedAt) {
          // Remote is newer, update local (including firestoreId)
          await updateStory(localStory.id, { ...remoteStory, firestoreId: remoteStory.firestoreId || remoteStory.id });
          await markStorySynced(localStory.id);
          pulledCount++;
        }
        // If local is newer, it will be pushed in next sync
      }
    }

    // Pull characters for each story
    const stories = await getAllStories(userId);
    for (const story of stories) {
      const charactersResult = await store.dispatch(
        firestoreApi.endpoints.listCharacters.initiate({
          userId,
          storyId: story.id,
        })
      );

      if (charactersResult.data) {
        for (const remoteChar of charactersResult.data) {
          const localChar = await getCharacter(remoteChar.id);
          
          if (!localChar) {
            await createCharacter(remoteChar);
            await markCharacterSynced(remoteChar.id);
            pulledCount++;
          } else if (remoteChar.updatedAt > localChar.updatedAt) {
            await updateCharacter(remoteChar.id, remoteChar);
            await markCharacterSynced(remoteChar.id);
            pulledCount++;
          }
        }
      }
    }

    // Pull blurbs, scenes, chapters for each story
    for (const story of stories) {
      // Pull blurbs
      const blurbsResult = await store.dispatch(
        firestoreApi.endpoints.listBlurbs.initiate({
          userId,
          storyId: story.id,
        })
      );
      if (blurbsResult.data) {
        for (const remoteBlurb of blurbsResult.data) {
          const localBlurb = await getBlurb(remoteBlurb.id);
          if (!localBlurb) {
            await createBlurb(remoteBlurb);
            await markBlurbSynced(remoteBlurb.id);
            pulledCount++;
          } else if (remoteBlurb.updatedAt > localBlurb.updatedAt) {
            await updateBlurb(remoteBlurb.id, remoteBlurb);
            await markBlurbSynced(remoteBlurb.id);
            pulledCount++;
          }
        }
      }

      // Pull scenes
      const scenesResult = await store.dispatch(
        firestoreApi.endpoints.listScenes.initiate({
          userId,
          storyId: story.id,
        })
      );
      if (scenesResult.data) {
        for (const remoteScene of scenesResult.data) {
          const localScene = await getScene(remoteScene.id);
          if (!localScene) {
            await createScene(remoteScene);
            await markSceneSynced(remoteScene.id);
            pulledCount++;
          } else if (remoteScene.updatedAt > localScene.updatedAt) {
            await updateScene(remoteScene.id, remoteScene);
            await markSceneSynced(remoteScene.id);
            pulledCount++;
          }
        }
      }

      // Pull chapters
      const chaptersResult = await store.dispatch(
        firestoreApi.endpoints.listChapters.initiate({
          userId,
          storyId: story.id,
        })
      );
      if (chaptersResult.data) {
        for (const remoteChapter of chaptersResult.data) {
          const localChapter = await getChapter(remoteChapter.id);
          if (!localChapter) {
            await createChapter(remoteChapter);
            await markChapterSynced(remoteChapter.id);
            pulledCount++;
          } else if (remoteChapter.updatedAt > localChapter.updatedAt) {
            await updateChapter(remoteChapter.id, remoteChapter);
            await markChapterSynced(remoteChapter.id);
            pulledCount++;
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
 * Uses Last-Write-Wins (LWW) strategy
 */
export const resolveConflict = <T extends { updatedAt: number }>(
  local: T,
  remote: T
): T => {
  if (remote.updatedAt > local.updatedAt) {
    return remote; // Remote is newer
  }
  return local; // Local is newer or equal
};
