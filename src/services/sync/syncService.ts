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
  getCharactersByIds,
} from '../database/characters';
import {
  getUnsyncedBlurbs,
  getBlurbsByStory,
  markBlurbSynced,
  createBlurb,
  updateBlurb,
  getBlurb,
  getBlurbsByIds,
} from '../database/blurbs';
import {
  getUnsyncedScenes,
  getScenesByStory,
  markSceneSynced,
  createScene,
  updateScene,
  getScene,
  getScenesByIds,
} from '../database/scenes';
import {
  getUnsyncedChapters,
  getChaptersByStory,
  markChapterSynced,
  createChapter,
  updateChapter,
  getChapter,
  getChaptersByIds,
} from '../database/chapters';
import {
  getUnsyncedShares,
  getSharesForStory,
  markStoryShareSynced,
  createStoryShare,
  updateStoryShare,
  getStoryShare,
  deleteStoryShare,
  getSharesForUser,
  getSharesByOwner,
} from '../database/storyShares';

// Firestore API imports
import { store } from '../../store';
import { firestoreApi } from '../../store/api/firestoreApi';
import { storiesApi } from '../../store/api/storiesApi';
import { getLastIncrementalSyncTime, updateLastSyncTime } from '../database/syncMetadata';

// Type imports
import type { Character, IdeaBlurb, Scene, Chapter, StoryShare } from '../../types';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: string[];
  duration: number;
}

type EntityType = 'story' | 'character' | 'blurb' | 'scene' | 'chapter' | 'generatedStory' | 'storyShare';

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
    'storyShare', // Share stories after stories are synced
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
    case 'storyShare':
      syncedCount = await syncStoryShares(userId);
      break;
    case 'generatedStory':
      // Generated stories sync handled separately if needed
      break;
  }

  return syncedCount;
};

/**
 * Sync Stories - Optimized with batch processing
 */
const syncStories = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedStories(userId);
  if (unsynced.length === 0) {
    return 0;
  }

  let syncedCount = 0;
  const BATCH_SIZE = 10; // Process in batches to avoid overwhelming the system
  
  // Process stories in parallel batches
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel (no retry for speed, failures go to queue)
    const results = await Promise.allSettled(
      batch.map(async (story) => {
        try {
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadStory.initiate(story)
          );
          if (!!uploadResult.error) {
            throw new Error('Failed to upload story to Firestore');
          }
          await markStorySynced(story.id);
          return { success: true, id: story.id };
        } catch (error) {
          // Add to queue for retry later
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { syncQueueManager } = require('./queueManager');
            await syncQueueManager.add('story', story.id, 'update');
          } catch (queueError) {
            console.error('Failed to add story to sync queue:', queueError);
          }
          return { success: false, id: story.id, error };
        }
      })
    );

    // Count successful syncs
    syncedCount += results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    // YIELD TO UI THREAD: Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return syncedCount;
};

/**
 * Sync Characters - Optimized with batch processing
 */
const syncCharacters = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedCharacters(userId);
  if (unsynced.length === 0) {
    return 0;
  }

  let syncedCount = 0;
  const BATCH_SIZE = 20; // Characters are smaller, can process more in parallel
  
  // Process characters in parallel batches
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (character) => {
        try {
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadCharacter.initiate(character)
          );
          if (!!uploadResult.error) {
            throw new Error(character.deleted ? 'Failed to delete character in Firestore' : 'Failed to sync character in Firestore');
          }
          await markCharacterSynced(character.id);
          return { success: true, id: character.id };
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { syncQueueManager } = require('./queueManager');
          syncQueueManager.add('character', character.id, character.deleted ? 'delete' : 'update');
          return { success: false, id: character.id, error };
        }
      })
    );

    syncedCount += results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    // YIELD TO UI THREAD: Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return syncedCount;
};

/**
 * Sync Blurbs - Optimized with batch processing
 */
const syncBlurbs = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedBlurbs(userId);
  if (unsynced.length === 0) {
    return 0;
  }

  let syncedCount = 0;
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (blurb) => {
        try {
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadBlurb.initiate(blurb)
          );
          if (!!uploadResult.error) {
            throw new Error('Failed to upload blurb to Firestore');
          }
          await markBlurbSynced(blurb.id);
          return { success: true, id: blurb.id };
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { syncQueueManager } = require('./queueManager');
          syncQueueManager.add('blurb', blurb.id, 'update');
          return { success: false, id: blurb.id, error };
        }
      })
    );

    syncedCount += results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    // YIELD TO UI THREAD: Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return syncedCount;
};

/**
 * Sync Scenes - Optimized with batch processing
 */
const syncScenes = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedScenes(userId);
  if (unsynced.length === 0) {
    return 0;
  }

  let syncedCount = 0;
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (scene) => {
        try {
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadScene.initiate(scene)
          );
          if (!!uploadResult.error) {
            throw new Error('Failed to upload scene to Firestore');
          }
          await markSceneSynced(scene.id);
          return { success: true, id: scene.id };
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { syncQueueManager } = require('./queueManager');
          syncQueueManager.add('scene', scene.id, 'update');
          return { success: false, id: scene.id, error };
        }
      })
    );

    syncedCount += results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    // YIELD TO UI THREAD: Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return syncedCount;
};

/**
 * Sync Chapters - Optimized with batch processing
 */
const syncChapters = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedChapters(userId);
  if (unsynced.length === 0) {
    return 0;
  }

  let syncedCount = 0;
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (chapter) => {
        try {
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadChapter.initiate(chapter)
          );
          if (!!uploadResult.error) {
            throw new Error('Failed to upload chapter to Firestore');
          }
          await markChapterSynced(chapter.id);
          return { success: true, id: chapter.id };
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { syncQueueManager } = require('./queueManager');
          syncQueueManager.add('chapter', chapter.id, 'update');
          return { success: false, id: chapter.id, error };
        }
      })
    );

    syncedCount += results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    // YIELD TO UI THREAD: Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return syncedCount;
};

/**
 * Sync StoryShares - Optimized with batch processing
 */
const syncStoryShares = async (userId: string): Promise<number> => {
  const unsynced = await getUnsyncedShares();
  if (unsynced.length === 0) {
    return 0;
  }

  let syncedCount = 0;
  const BATCH_SIZE = 20;

  // Process shares in parallel batches
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (share) => {
        try {
          const uploadResult = await store.dispatch(
            firestoreApi.endpoints.uploadStoryShare.initiate(share)
          );
          if (!!uploadResult.error) {
            throw new Error('Failed to upload story share to Firestore');
          }
          await markStoryShareSynced(share.id);
          return { success: true, id: share.id };
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { syncQueueManager } = require('./queueManager');
          syncQueueManager.add('storyShare', share.id, 'update');
          return { success: false, id: share.id, error };
        }
      })
    );

    syncedCount += results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    // YIELD TO UI THREAD: Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
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

    // Download story shares and their associated story documents
    const sharedStoryIds = new Set<string>();
    let sharesResult: any = null;
    const remoteShareIds = new Set<string>();
    const pendingSharesToCreate = new Array<StoryShare>(); // Shares to create after stories are downloaded
    const affectedStoryIds = new Set<string>(); // Track story IDs affected by share updates
    
    try {
      sharesResult = await store.dispatch(
        firestoreApi.endpoints.downloadStoryShares.initiate(userId)
      );
      if (sharesResult?.data) {
        for (const remoteShare of sharesResult.data) {
          remoteShareIds.add(remoteShare.id);
          affectedStoryIds.add(remoteShare.storyId); // Track affected story
          const localShare = await getStoryShare(remoteShare.id);
          
          // Filter by timestamp if incremental sync
          if (sinceTimestamp && remoteShare.updatedAt <= sinceTimestamp) {
            continue;
          }

          // Track story IDs from shares (for downloading shared stories)
          if (remoteShare.sharedWithUserId === userId) {
            sharedStoryIds.add(remoteShare.storyId);
            storiesToSyncEntities.add(remoteShare.storyId);
          }

          // Check if the story exists locally before creating the share
          // If it's a shared story (not owned), we'll create the share after downloading the story
          const storyExists = await getStory(remoteShare.storyId);
          const isSharedStory = remoteShare.sharedWithUserId === userId && remoteShare.ownerId !== userId;
          
          if (isSharedStory && !storyExists) {
            // Defer creating this share until after we download the story
            pendingSharesToCreate.push(remoteShare);
            continue;
          }

          if (!localShare) {
            // New share from remote, create locally and mark as synced
            // Story must exist at this point (either owned or already downloaded)
            await createStoryShare(remoteShare);
            await markStoryShareSynced(remoteShare.id);
            pulledCount++;
          } else {
            // Resolve conflict using Last-Write-Wins
            const shouldUseRemote = localShare.synced
              ? remoteShare.updatedAt > localShare.updatedAt
              : resolveConflict(localShare, remoteShare) === remoteShare || remoteShare.updatedAt > localShare.updatedAt;
            
            if (shouldUseRemote) {
              // Update only the fields that can be updated (permission)
              await updateStoryShare(remoteShare.id, {
                permission: remoteShare.permission,
              });
              await markStoryShareSynced(remoteShare.id);
              pulledCount++;
            }
          }
        }
      }
      
      // Delete local storyShares that no longer exist in Firestore
      // downloadStoryShares returns shares where user is owner OR shared with user
      // So we need to check both types of local shares
      const sharesSharedWithUser = await getSharesForUser(userId);
      const sharesOwnedByUser = await getSharesByOwner(userId);
      
      // Combine and deduplicate by share ID
      const allLocalShares = new Map<string, StoryShare>();
      sharesSharedWithUser.forEach(share => allLocalShares.set(share.id, share));
      sharesOwnedByUser.forEach(share => allLocalShares.set(share.id, share));
      
      // Delete local shares that no longer exist in Firestore
      for (const localShare of allLocalShares.values()) {
        // Only delete if the share is synced (meaning it came from Firestore)
        // If it's unsynced, it might be a pending local change
        if (localShare.synced && !remoteShareIds.has(localShare.id)) {
          affectedStoryIds.add(localShare.storyId); // Track affected story
          await deleteStoryShare(localShare.id);
          pulledCount++;
        }
      }
    } catch (error) {
      console.error('Error downloading story shares:', error);
    }
    
    // Invalidate stories cache if we downloaded any story shares
    // This ensures the stories list and individual story queries are refreshed with updated share information
    if (affectedStoryIds.size > 0 || (sharesResult?.data && sharesResult.data.length > 0)) {
      const tagsToInvalidate = [
        { type: 'Story' as const, id: 'LIST' },
        ...Array.from(affectedStoryIds).map((storyId) => ({ type: 'Story' as const, id: storyId })),
      ];
      store.dispatch(storiesApi.util.invalidateTags(tagsToInvalidate));
    }

    // Download shared story documents (stories shared with this user)
    // After downloading shares, we need to download the actual story documents
    if (sharedStoryIds.size > 0) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        const { fromFirestoreStory } = await import('../firestore/conversion');
        
        // Download each shared story document
        for (const storyId of sharedStoryIds) {
          try {
            // Check if story already exists locally (might be owned by user)
            const localStory = await getStory(storyId);
            if (localStory && localStory.userId === userId) {
              // User owns this story, skip (already downloaded above)
              continue;
            }

            // Download story document from Firestore
            const storyDocRef = doc(db, 'stories', storyId);
            const storyDocSnap = await getDoc(storyDocRef);
            
            if (storyDocSnap.exists()) {
              const firestoreData = storyDocSnap.data();
              const remoteStory = fromFirestoreStory(storyId, firestoreData);
              
              // Filter by timestamp if incremental sync
              if (sinceTimestamp && remoteStory.updatedAt <= sinceTimestamp) {
                continue;
              }

              if (!localStory) {
                // New shared story, create locally and mark as synced
                await createStory(remoteStory);
                await markStorySynced(remoteStory.id);
                pulledCount++;
              } else {
                // Update existing shared story if remote is newer
                const shouldUseRemote = localStory.synced
                  ? remoteStory.updatedAt > localStory.updatedAt
                  : resolveConflict(localStory, remoteStory) === remoteStory || remoteStory.updatedAt > localStory.updatedAt;
                
                if (shouldUseRemote) {
                  await updateStory(remoteStory.id, remoteStory as any);
                  await markStorySynced(remoteStory.id);
                  pulledCount++;
                }
              }
            }
          } catch (storyError) {
            console.error(`Error downloading shared story ${storyId}:`, storyError);
          }
        }
      } catch (error) {
        console.error('Error downloading shared story documents:', error);
      }
      
      // Now create any pending StoryShare records that we deferred earlier
      // (they were deferred because the story didn't exist yet)
      for (const pendingShare of pendingSharesToCreate) {
        try {
          // Verify the story now exists before creating the share
          const storyExists = await getStory(pendingShare.storyId);
          if (storyExists) {
            const localShare = await getStoryShare(pendingShare.id);
            if (!localShare) {
              await createStoryShare(pendingShare);
              await markStoryShareSynced(pendingShare.id);
              affectedStoryIds.add(pendingShare.storyId); // Track affected story
              pulledCount++;
            }
          } else {
            console.warn(`Skipping share ${pendingShare.id} - story ${pendingShare.storyId} still doesn't exist after download`);
          }
        } catch (shareError) {
          console.error(`Error creating deferred share ${pendingShare.id}:`, shareError);
        }
      }
      
      // Invalidate stories cache after downloading shared story documents and creating pending shares
      // This ensures the stories list and individual story queries are refreshed
      if (sharedStoryIds.size > 0 || pendingSharesToCreate.length > 0) {
        const tagsToInvalidate = [
          { type: 'Story' as const, id: 'LIST' },
          ...Array.from(affectedStoryIds).map((storyId) => ({ type: 'Story' as const, id: storyId })),
        ];
        store.dispatch(storiesApi.util.invalidateTags(tagsToInvalidate));
      }
    }

    // Pull entities for each story using downloadEntitiesForStory
    // Use both remote stories (from Firestore) and local stories to ensure all stories are covered
    const localStories = await getAllStories(userId);
    
    // Add all local story IDs to the set (including completed stories)
    for (const story of localStories) {
      storiesToSyncEntities.add(story.id);
    }
    
    // Pre-fetch all local entities for all stories at once (performance optimization)
    const storyIdsArray = Array.from(storiesToSyncEntities);
    const allLocalEntitiesMap = new Map<string, {
      characters: Character[];
      blurbs: IdeaBlurb[];
      scenes: Scene[];
      chapters: Chapter[];
    }>();

    // Fetch all local entities in parallel for all stories
    await Promise.all(
      storyIdsArray.map(async (storyId) => {
        const [characters, blurbs, scenes, chapters] = await Promise.all([
          getCharactersByStory(storyId),
          getBlurbsByStory(storyId),
          getScenesByStory(storyId),
          getChaptersByStory(storyId),
        ]);
        allLocalEntitiesMap.set(storyId, { characters, blurbs, scenes, chapters });
      })
    );
    
    // Process stories in parallel batches (biggest performance improvement)
    const STORY_BATCH_SIZE = 5; // Process 5 stories in parallel
    
    for (let i = 0; i < storyIdsArray.length; i += STORY_BATCH_SIZE) {
      const storyBatch = storyIdsArray.slice(i, i + STORY_BATCH_SIZE);
      
      // Process batch of stories in parallel
      const storyResults = await Promise.allSettled(
        storyBatch.map(async (storyId) => {
          // Get the story to ensure it exists (may have been pulled or already local)
          const story = await getStory(storyId);
          if (!story) {
            // Story doesn't exist locally, skip
            return { count: 0 };
          }
          
          // Get pre-fetched local entities for this story
          const localEntities = allLocalEntitiesMap.get(storyId) || {
            characters: [],
            blurbs: [],
            scenes: [],
            chapters: [],
          };

          // Download all entities for this story (including completed stories)
          const entitiesResult = await store.dispatch(
            firestoreApi.endpoints.downloadEntitiesForStory.initiate({
              storyId,
              localEntities,
            })
          );

          if (!entitiesResult.data) {
            return { count: 0 };
          }

          let storyPulledCount = 0;
          const entitiesData = entitiesResult.data;

          // Track remote entity IDs to detect deletions
          const remoteCharacterIds = new Set<string>();
          const remoteBlurbIds = new Set<string>();
          const remoteSceneIds = new Set<string>();
          const remoteChapterIds = new Set<string>();

          // BATCH QUERY OPTIMIZATION: Fetch all local entities in one query per type
          const remoteCharIds = (entitiesData.characters || []).map(c => c.id);
          const localCharsMap = remoteCharIds.length > 0 ? await getCharactersByIds(remoteCharIds) : new Map();

          // Process characters
          for (const remoteChar of entitiesData.characters || []) {
            // Always track remote entity IDs to detect deletions, regardless of timestamp
            remoteCharacterIds.add(remoteChar.id);

            // Filter by timestamp if incremental sync (skip update but still track for deletion check)
            if (sinceTimestamp && remoteChar.updatedAt <= sinceTimestamp) {
              continue;
            }
            const localChar = localCharsMap.get(remoteChar.id);
            if (!localChar) {
              // New character from remote, create locally and mark as synced
              await createCharacter(remoteChar);
              await markCharacterSynced(remoteChar.id);
              storyPulledCount++;
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
                storyPulledCount++;
              }
              // If local is newer and unsynced, it will be pushed in next sync
            }
          }
          
          // Delete local characters that don't exist in remote (were deleted in Firestore)
          // Only delete if they're synced (local changes take precedence)
          for (const localChar of localEntities.characters) {
            if (!localChar.deleted && !remoteCharacterIds.has(localChar.id) && localChar.synced) {
              // Character was deleted remotely, delete locally
              const { deleteCharacter } = require('../database/characters');
              await deleteCharacter(localChar.id);
              storyPulledCount++;
              console.log(`Deleted local character ${localChar.id} - removed from Firestore`);
            }
          }

          // BATCH QUERY OPTIMIZATION: Fetch all local blurbs in one query
          const remoteBlurbIdsList = (entitiesData.blurbs || []).map(b => b.id);
          const localBlurbsMap = remoteBlurbIdsList.length > 0 ? await getBlurbsByIds(remoteBlurbIdsList) : new Map();

          // Process blurbs
          for (const remoteBlurb of entitiesData.blurbs || []) {
            // Always track remote entity IDs to detect deletions, regardless of timestamp
            remoteBlurbIds.add(remoteBlurb.id);

            // Filter by timestamp if incremental sync (skip update but still track for deletion check)
            if (sinceTimestamp && remoteBlurb.updatedAt <= sinceTimestamp) {
              continue;
            }
            const localBlurb = localBlurbsMap.get(remoteBlurb.id);
            if (!localBlurb) {
              // New blurb from remote, create locally and mark as synced
              await createBlurb(remoteBlurb);
              await markBlurbSynced(remoteBlurb.id);
              storyPulledCount++;
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
                storyPulledCount++;
              }
              // If local is newer and unsynced, it will be pushed in next sync
            }
          }
          
          // Delete local blurbs that don't exist in remote (were deleted in Firestore)
          // Only delete if they're synced (local changes take precedence)
          for (const localBlurb of localEntities.blurbs) {
            if (!localBlurb.deleted && !remoteBlurbIds.has(localBlurb.id) && localBlurb.synced) {
              // Blurb was deleted remotely, delete locally
              const { deleteBlurb } = require('../database/blurbs');
              await deleteBlurb(localBlurb.id);
              storyPulledCount++;
              console.log(`Deleted local blurb ${localBlurb.id} - removed from Firestore`);
            }
          }

          // BATCH QUERY OPTIMIZATION: Fetch all local scenes in one query
          const remoteSceneIdsList = (entitiesData.scenes || []).map(s => s.id);
          const localScenesMap = remoteSceneIdsList.length > 0 ? await getScenesByIds(remoteSceneIdsList) : new Map();

          // Process scenes
          for (const remoteScene of entitiesData.scenes || []) {
            // Always track remote entity IDs to detect deletions, regardless of timestamp
            remoteSceneIds.add(remoteScene.id);

            // Filter by timestamp if incremental sync (skip update but still track for deletion check)
            if (sinceTimestamp && remoteScene.updatedAt <= sinceTimestamp) {
              continue;
            }
            const localScene = localScenesMap.get(remoteScene.id);
            if (!localScene) {
              // New scene from remote, create locally and mark as synced
              await createScene(remoteScene);
              await markSceneSynced(remoteScene.id);
              storyPulledCount++;
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
                storyPulledCount++;
              }
              // If local is newer and unsynced, it will be pushed in next sync
            }
          }
          
          // Delete local scenes that don't exist in remote (were deleted in Firestore)
          // Only delete if they're synced (local changes take precedence)
          for (const localScene of localEntities.scenes) {
            if (!localScene.deleted && !remoteSceneIds.has(localScene.id) && localScene.synced) {
              // Scene was deleted remotely, delete locally
              const { deleteScene } = require('../database/scenes');
              await deleteScene(localScene.id);
              storyPulledCount++;
              console.log(`Deleted local scene ${localScene.id} - removed from Firestore`);
            }
          }

          // BATCH QUERY OPTIMIZATION: Fetch all local chapters in one query
          const remoteChapterIdsList = (entitiesData.chapters || []).map(c => c.id);
          const localChaptersMap = remoteChapterIdsList.length > 0 ? await getChaptersByIds(remoteChapterIdsList) : new Map();

          // Process chapters
          for (const remoteChapter of entitiesData.chapters || []) {
            // Always track remote entity IDs to detect deletions, regardless of timestamp
            remoteChapterIds.add(remoteChapter.id);

            // Filter by timestamp if incremental sync (skip update but still track for deletion check)
            if (sinceTimestamp && remoteChapter.updatedAt <= sinceTimestamp) {
              continue;
            }
            const localChapter = localChaptersMap.get(remoteChapter.id);
            if (!localChapter) {
              // New chapter from remote, create locally and mark as synced
              await createChapter(remoteChapter);
              await markChapterSynced(remoteChapter.id);
              storyPulledCount++;
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
                storyPulledCount++;
              }
              // If local is newer and unsynced, it will be pushed in next sync
            }
          }
          
          // Delete local chapters that are marked as deleted in Firestore
          const deletedChapterIds = entitiesData.deletedChapters || [];
          if (deletedChapterIds.length > 0) {
            // BATCH QUERY OPTIMIZATION: Fetch all deleted chapters in one query
            const deletedChaptersMap = await getChaptersByIds(deletedChapterIds);
            const { deleteChapter } = require('../database/chapters');
            for (const deletedChapterId of deletedChapterIds) {
              if (deletedChaptersMap.has(deletedChapterId)) {
                // Chapter is marked as deleted in Firestore, hard delete from local DB
                await deleteChapter(deletedChapterId);
                storyPulledCount++;
                console.log(`Hard deleted local chapter ${deletedChapterId} - marked as deleted in Firestore`);
              }
            }
          }
          
          // Delete local chapters that don't exist in remote (were deleted in Firestore)
          // Only delete if they're synced (local changes take precedence)
          for (const localChapter of localEntities.chapters) {
            if (!localChapter.deleted && !remoteChapterIds.has(localChapter.id) && localChapter.synced) {
              // Chapter was deleted remotely (no longer exists), delete locally
              const { deleteChapter } = require('../database/chapters');
              await deleteChapter(localChapter.id);
              storyPulledCount++;
              console.log(`Deleted local chapter ${localChapter.id} - removed from Firestore`);
            }
          }

          return { count: storyPulledCount };
        })
      );

      // Sum up pulled counts from batch
      storyResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          pulledCount += result.value.count;
        }
      });

      // YIELD TO UI THREAD: Allow UI to update between batches
      // This prevents UI freezing during long sync operations
      await new Promise(resolve => setTimeout(resolve, 0));
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
