/**
 * Firestore service
 * Handles Firestore initialization, collection references, helper functions,
 * and upload/download operations for syncing with SQLite
 */
import {
  collection,
  doc,
  writeBatch,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { db as firestore } from '../../config/firebase';
import type {
  Story,
  Character,
  IdeaBlurb,
  Scene,
  Chapter,
} from '../../types';
import {
  toFirestoreStory,
  fromFirestoreStory,
  toFirestoreCharacter,
  fromFirestoreCharacter,
  toFirestoreBlurb,
  fromFirestoreBlurb,
  toFirestoreScene,
  fromFirestoreScene,
  toFirestoreChapter,
  fromFirestoreChapter,
  type FirestoreStoryData,
  type FirestoreCharacterData,
  type FirestoreBlurbData,
  type FirestoreSceneData,
  type FirestoreChapterData,
} from './conversion';

/**
 * Get Firestore instance
 * Uses the existing Firestore instance from the Firebase config
 */
export function getFirestoreInstance(): Firestore {
  if (!firestore) {
    throw new Error(
      'Firestore is not initialized. Please ensure Firebase is properly configured.'
    );
  }
  return firestore;
}

// ============================================================================
// Collection References
// ============================================================================

/**
 * Get stories collection reference
 */
export function getStoriesCollection() {
  const db = getFirestoreInstance();
  return collection(db, 'stories');
}

/**
 * Get a specific story document reference
 */
export function getStoryDoc(storyId: string) {
  const db = getFirestoreInstance();
  return doc(db, 'stories', storyId);
}

/**
 * Get characters collection reference
 */
export function getCharactersCollection() {
  const db = getFirestoreInstance();
  return collection(db, 'characters');
}

/**
 * Get a specific character document reference
 */
export function getCharacterDoc(characterId: string) {
  const db = getFirestoreInstance();
  return doc(db, 'characters', characterId);
}

/**
 * Get blurbs collection reference
 */
export function getBlurbsCollection() {
  const db = getFirestoreInstance();
  return collection(db, 'blurbs');
}

/**
 * Get a specific blurb document reference
 */
export function getBlurbDoc(blurbId: string) {
  const db = getFirestoreInstance();
  return doc(db, 'blurbs', blurbId);
}

/**
 * Get scenes collection reference
 */
export function getScenesCollection() {
  const db = getFirestoreInstance();
  return collection(db, 'scenes');
}

/**
 * Get a specific scene document reference
 */
export function getSceneDoc(sceneId: string) {
  const db = getFirestoreInstance();
  return doc(db, 'scenes', sceneId);
}

/**
 * Get chapters collection reference
 */
export function getChaptersCollection() {
  const db = getFirestoreInstance();
  return collection(db, 'chapters');
}

/**
 * Get a specific chapter document reference
 */
export function getChapterDoc(chapterId: string) {
  const db = getFirestoreInstance();
  return doc(db, 'chapters', chapterId);
}

/**
 * Get generatedStories collection reference
 */
export function getGeneratedStoriesCollection() {
  const db = getFirestoreInstance();
  return collection(db, 'generatedStories');
}

/**
 * Get a specific generated story document reference
 */
export function getGeneratedStoryDoc(generatedStoryId: string) {
  const db = getFirestoreInstance();
  return doc(db, 'generatedStories', generatedStoryId);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if Firebase/Firestore is configured and initialized
 */
export function isFirebaseConfigured(): boolean {
  try {
    return !!firestore;
  } catch {
    return false;
  }
}

/**
 * Validate Firestore document data
 */
export function validateFirestoreData<T>(
  data: any,
  requiredFields: (keyof T)[]
): data is T {
  if (!data || typeof data !== 'object') {
    return false;
  }

  for (const field of requiredFields) {
    if (!(field in data)) {
      return false;
    }
  }

  return true;
}

/**
 * Get collection name for an entity type
 */
export function getCollectionName(
  entityType: 'story' | 'character' | 'blurb' | 'scene' | 'chapter' | 'generatedStory'
): string {
  const collectionMap = {
    story: 'stories',
    character: 'characters',
    blurb: 'blurbs',
    scene: 'scenes',
    chapter: 'chapters',
    generatedStory: 'generatedStories',
  };

  return collectionMap[entityType];
}

/**
 * Get document reference for an entity
 */
export function getEntityDoc(
  entityType: 'story' | 'character' | 'blurb' | 'scene' | 'chapter' | 'generatedStory',
  entityId: string
) {
  const collectionName = getCollectionName(entityType);
  const db = getFirestoreInstance();
  return doc(db, collectionName, entityId);
}

/**
 * Batch helper: Get a batch writer
 */
export function getBatch() {
  const db = getFirestoreInstance();
  return writeBatch(db);
}

// ============================================================================
// Upload Functions (Task 12.5)
// ============================================================================

/**
 * Upload a story to Firestore
 * Converts SQLite format to Firestore format and uploads
 * Uses firestoreId if available, otherwise uses local id
 */
export async function uploadStory(story: Story): Promise<Story> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  // Use firestoreId if available, otherwise use local id
  const firestoreDocId = story.firestoreId || story.id;
  const docRef = getStoryDoc(firestoreDocId);
  const firestoreData = toFirestoreStory(story);

  // Use setDoc with merge to handle both create and update
  await setDoc(docRef, {
    ...firestoreData,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // Return story with firestoreId set
  return { ...story, firestoreId: firestoreDocId, synced: true };
}

/**
 * Upload a character to Firestore
 * Converts SQLite format to Firestore format and uploads
 */
export async function uploadCharacter(character: Character): Promise<Character> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getCharacterDoc(character.id);
  const firestoreData = toFirestoreCharacter(character);

  await setDoc(docRef, {
    ...firestoreData,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return { ...character, synced: true };
}

/**
 * Upload a blurb to Firestore
 * Converts SQLite format to Firestore format and uploads
 */
export async function uploadBlurb(blurb: IdeaBlurb): Promise<IdeaBlurb> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getBlurbDoc(blurb.id);
  const firestoreData = toFirestoreBlurb(blurb);

  await setDoc(docRef, {
    ...firestoreData,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return { ...blurb, synced: true };
}

/**
 * Upload a scene to Firestore
 * Converts SQLite format to Firestore format and uploads
 */
export async function uploadScene(scene: Scene): Promise<Scene> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getSceneDoc(scene.id);
  const firestoreData = toFirestoreScene(scene);

  await setDoc(docRef, {
    ...firestoreData,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return { ...scene, synced: true };
}

/**
 * Upload a chapter to Firestore
 * Converts SQLite format to Firestore format and uploads
 */
export async function uploadChapter(chapter: Chapter): Promise<Chapter> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getChapterDoc(chapter.id);
  const firestoreData = toFirestoreChapter(chapter);

  await setDoc(docRef, {
    ...firestoreData,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return { ...chapter, synced: true };
}

// ============================================================================
// Download Functions (Task 12.6)
// ============================================================================

/**
 * Conflict resolution strategy: Last-write-wins
 * Compares updatedAt timestamps and returns the entity with the later timestamp
 */
function resolveConflict<T extends { updatedAt: number }>(
  local: T,
  remote: T
): T {
  return remote.updatedAt >= local.updatedAt ? remote : local;
}

/**
 * Download all stories for a user from Firestore
 * Converts Firestore format to SQLite format
 * @param userId - The user ID to fetch stories for
 * @returns Array of stories in SQLite format
 */
export async function downloadStories(userId: string): Promise<Story[]> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const storiesCollection = getStoriesCollection();
  const q = query(storiesCollection, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

    const stories: Story[] = [];
    querySnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const story = fromFirestoreStory(docSnap.id, data);
      stories.push(story);
    } catch (error) {
      console.error(`Error converting story ${docSnap.id}:`, error);
    }
  });

  return stories;
}

/**
 * Download all entities (characters, blurbs, scenes, chapters) for a story from Firestore
 * Converts Firestore format to SQLite format
 * Handles conflicts using last-write-wins strategy
 * @param storyId - The story ID to fetch entities for
 * @param localEntities - Optional local entities to resolve conflicts with
 * @returns Object containing arrays of entities in SQLite format
 */
export async function downloadEntitiesForStory(
  storyId: string,
  localEntities?: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  }
): Promise<{
  characters: Character[];
  blurbs: IdeaBlurb[];
  scenes: Scene[];
  chapters: Chapter[];
}> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const results = {
    characters: [] as Character[],
    blurbs: [] as IdeaBlurb[],
    scenes: [] as Scene[],
    chapters: [] as Chapter[],
  };

  // Download characters
  try {
    const charactersCollection = getCharactersCollection();
    const charactersQuery = query(
      charactersCollection,
      where('storyId', '==', storyId),
      where('deleted', '==', false)
    );
    const charactersSnapshot = await getDocs(charactersQuery);

    charactersSnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const remoteCharacter = fromFirestoreCharacter(docSnap.id, data);

        // Resolve conflict if local entity exists
        if (localEntities?.characters) {
          const localCharacter = localEntities.characters.find(
            (c) => c.id === remoteCharacter.id
          );
          if (localCharacter) {
            const resolved = resolveConflict(localCharacter, remoteCharacter);
            results.characters.push(resolved);
            return;
          }
        }

        results.characters.push(remoteCharacter);
      } catch (error) {
        console.error(`Error converting character ${docSnap.id}:`, error);
      }
    });
  } catch (error) {
    console.error('Error downloading characters:', error);
  }

  // Download blurbs
  try {
    const blurbsCollection = getBlurbsCollection();
    const blurbsQuery = query(
      blurbsCollection,
      where('storyId', '==', storyId),
      where('deleted', '==', false)
    );
    const blurbsSnapshot = await getDocs(blurbsQuery);

    blurbsSnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const remoteBlurb = fromFirestoreBlurb(docSnap.id, data);

        // Resolve conflict if local entity exists
        if (localEntities?.blurbs) {
          const localBlurb = localEntities.blurbs.find(
            (b) => b.id === remoteBlurb.id
          );
          if (localBlurb) {
            const resolved = resolveConflict(localBlurb, remoteBlurb);
            results.blurbs.push(resolved);
            return;
          }
        }

        results.blurbs.push(remoteBlurb);
      } catch (error) {
        console.error(`Error converting blurb ${docSnap.id}:`, error);
      }
    });
  } catch (error) {
    console.error('Error downloading blurbs:', error);
  }

  // Download scenes
  try {
    const scenesCollection = getScenesCollection();
    const scenesQuery = query(
      scenesCollection,
      where('storyId', '==', storyId),
      where('deleted', '==', false)
    );
    const scenesSnapshot = await getDocs(scenesQuery);

    scenesSnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const remoteScene = fromFirestoreScene(docSnap.id, data);

        // Resolve conflict if local entity exists
        if (localEntities?.scenes) {
          const localScene = localEntities.scenes.find(
            (s) => s.id === remoteScene.id
          );
          if (localScene) {
            const resolved = resolveConflict(localScene, remoteScene);
            results.scenes.push(resolved);
            return;
          }
        }

        results.scenes.push(remoteScene);
      } catch (error) {
        console.error(`Error converting scene ${docSnap.id}:`, error);
      }
    });
  } catch (error) {
    console.error('Error downloading scenes:', error);
  }

  // Download chapters
  try {
    const chaptersCollection = getChaptersCollection();
    const chaptersQuery = query(
      chaptersCollection,
      where('storyId', '==', storyId),
      where('deleted', '==', false)
    );
    const chaptersSnapshot = await getDocs(chaptersQuery);

    chaptersSnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const remoteChapter = fromFirestoreChapter(docSnap.id, data);

        // Resolve conflict if local entity exists
        if (localEntities?.chapters) {
          const localChapter = localEntities.chapters.find(
            (c) => c.id === remoteChapter.id
          );
          if (localChapter) {
            const resolved = resolveConflict(localChapter, remoteChapter);
            results.chapters.push(resolved);
            return;
          }
        }

        results.chapters.push(remoteChapter);
      } catch (error) {
        console.error(`Error converting chapter ${docSnap.id}:`, error);
      }
    });
  } catch (error) {
    console.error('Error downloading chapters:', error);
  }

  return results;
}

// ============================================================================
// Get Single Entity Functions
// ============================================================================

/**
 * Get a single story from Firestore by ID
 */
export async function getStory(storyId: string): Promise<Story | null> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getStoryDoc(storyId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    try {
      const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
      return fromFirestoreStory(docSnap.id, data);
    } catch (error) {
      console.error(`Error converting story ${storyId}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Get a single character from Firestore by ID
 */
export async function getCharacter(characterId: string): Promise<Character | null> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getCharacterDoc(characterId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    try {
      const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
      return fromFirestoreCharacter(docSnap.id, data);
    } catch (error) {
      console.error(`Error converting character ${characterId}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Get a single blurb from Firestore by ID
 */
export async function getBlurb(blurbId: string): Promise<IdeaBlurb | null> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getBlurbDoc(blurbId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    try {
      const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
      return fromFirestoreBlurb(docSnap.id, data);
    } catch (error) {
      console.error(`Error converting blurb ${blurbId}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Get a single scene from Firestore by ID
 */
export async function getScene(sceneId: string): Promise<Scene | null> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getSceneDoc(sceneId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    try {
      const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
      return fromFirestoreScene(docSnap.id, data);
    } catch (error) {
      console.error(`Error converting scene ${sceneId}:`, error);
      return null;
    }
  }

  return null;
}

/**
 * Get a single chapter from Firestore by ID
 */
export async function getChapter(chapterId: string): Promise<Chapter | null> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getChapterDoc(chapterId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    try {
      const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
      return fromFirestoreChapter(docSnap.id, data);
    } catch (error) {
      console.error(`Error converting chapter ${chapterId}:`, error);
      return null;
    }
  }

  return null;
}

// ============================================================================
// List Functions (for syncService compatibility)
// ============================================================================

/**
 * List all stories for a user (alias for downloadStories for consistency)
 */
export async function listStories(userId: string): Promise<Story[]> {
  return downloadStories(userId);
}

/**
 * List all characters for a story
 */
export async function listCharacters(storyId: string): Promise<Character[]> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const charactersCollection = getCharactersCollection();
  const q = query(
    charactersCollection,
    where('storyId', '==', storyId),
    where('deleted', '==', false)
  );
  const querySnapshot = await getDocs(q);

  const characters: Character[] = [];
  querySnapshot.forEach((docSnap) => {
    try {
      const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
      const character = fromFirestoreCharacter(docSnap.id, data);
      characters.push(character);
    } catch (error) {
      console.error(`Error converting character ${docSnap.id}:`, error);
    }
  });

  return characters;
}

/**
 * List all blurbs for a story
 */
export async function listBlurbs(storyId: string): Promise<IdeaBlurb[]> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const blurbsCollection = getBlurbsCollection();
  const q = query(
    blurbsCollection,
    where('storyId', '==', storyId),
    where('deleted', '==', false)
  );
  const querySnapshot = await getDocs(q);

  const blurbs: IdeaBlurb[] = [];
    querySnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const blurb = fromFirestoreBlurb(docSnap.id, data);
      blurbs.push(blurb);
    } catch (error) {
      console.error(`Error converting blurb ${docSnap.id}:`, error);
    }
  });

  return blurbs;
}

/**
 * List all scenes for a story
 */
export async function listScenes(storyId: string): Promise<Scene[]> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const scenesCollection = getScenesCollection();
  const q = query(
    scenesCollection,
    where('storyId', '==', storyId),
    where('deleted', '==', false)
  );
  const querySnapshot = await getDocs(q);

  const scenes: Scene[] = [];
    querySnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const scene = fromFirestoreScene(docSnap.id, data);
      scenes.push(scene);
    } catch (error) {
      console.error(`Error converting scene ${docSnap.id}:`, error);
    }
  });

  return scenes;
}

/**
 * List all chapters for a story
 */
export async function listChapters(storyId: string): Promise<Chapter[]> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const chaptersCollection = getChaptersCollection();
  const q = query(
    chaptersCollection,
    where('storyId', '==', storyId),
    where('deleted', '==', false)
  );
  const querySnapshot = await getDocs(q);

  const chapters: Chapter[] = [];
    querySnapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data(); // Get raw Firestore data (may contain Timestamps)
        const chapter = fromFirestoreChapter(docSnap.id, data);
      chapters.push(chapter);
    } catch (error) {
      console.error(`Error converting chapter ${docSnap.id}:`, error);
    }
  });

  return chapters;
}

// ============================================================================
// Delete Functions
// ============================================================================

/**
 * Delete a character from Firestore
 */
export async function deleteCharacter(characterId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getCharacterDoc(characterId);
  await deleteDoc(docRef);
}

/**
 * Delete a blurb from Firestore
 */
export async function deleteBlurb(blurbId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getBlurbDoc(blurbId);
  await deleteDoc(docRef);
}

/**
 * Delete a scene from Firestore
 */
export async function deleteScene(sceneId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getSceneDoc(sceneId);
  await deleteDoc(docRef);
}

/**
 * Delete a chapter from Firestore
 */
export async function deleteChapter(chapterId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getChapterDoc(chapterId);
  await deleteDoc(docRef);
}

/**
 * Delete a story from Firestore
 */
export async function deleteStory(storyId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const docRef = getStoryDoc(storyId);
  await deleteDoc(docRef);
}
