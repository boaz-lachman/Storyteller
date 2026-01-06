/**
 * Sync Service
 * Handles synchronization between SQLite (local) and Firestore (remote)
 */
import { isOnline } from '../../utils/networkHelpers';
import { getCurrentTimestamp, retryWithBackoff } from '../../utils/helpers';
import { syncQueueManager } from './queueManager';

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
import { store } from '../../store';
import { firestoreApi } from '../../store/api/firestoreApi';

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
    const online = await isOnline();
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
 */
export const pushUnsyncedChanges = async (userId: string): Promise<number> => {
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

        if (storyExists) {
          // Update existing story
          const updateResult = await store.dispatch(
            firestoreApi.endpoints.updateStory.initiate({
              userId: story.userId,
              id: story.id,
              data: story,
            })
          );
          if (!!updateResult.error) {
            throw new Error('Failed to update story in Firestore');
          }
        } else {
          // Create new story
          const createResult = await store.dispatch(
            firestoreApi.endpoints.createStory.initiate(story)
          );
          if (!!createResult.error) {
            throw new Error('Failed to create story in Firestore');
          }
        }

        await markStorySynced(story.id);
        syncedCount++;
      });
    } catch (error) {
      console.error(`Failed to sync story ${story.id}:`, error);
      syncQueueManager.add('story', story.id, 'update');
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
      syncQueueManager.add('chapter', chapter.id, 'update');
    }
  }

  return syncedCount;
};

/**
 * Phase 2: Pull remote changes from Firestore
 */
export const pullRemoteChanges = async (userId: string): Promise<number> => {
  let pulledCount = 0;

  try {
    // Pull stories
    const storiesResult = await store.dispatch(
      firestoreApi.endpoints.listStories.initiate({ userId })
    );
    if (storiesResult.data) {
      for (const remoteStory of storiesResult.data) {
        const localStory = await getStory(remoteStory.id);
        
        if (!localStory) {
          // New story from remote, create locally
          await createStory(remoteStory);
          pulledCount++;
        } else if (remoteStory.updatedAt > localStory.updatedAt) {
          // Remote is newer, update local
          await updateStory(remoteStory.id, remoteStory);
          await markStorySynced(remoteStory.id);
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
