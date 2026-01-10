/**
 * Conversion utilities for SQLite ↔ Firestore
 * Handles type conversions, null/undefined normalization, and JSON array serialization
 */
import type {
  Story,
  Character,
  IdeaBlurb,
  Scene,
  Chapter,
  GeneratedStory,
} from '../../types';
import { safeJsonParse, safeJsonStringify } from '../../utils/helpers';
import { Timestamp } from 'firebase/firestore';

/**
 * Helper function to convert Firestore Timestamp to number (milliseconds)
 * Handles various Firestore Timestamp formats:
 * - Firestore Timestamp instance (toMillis/toDate methods)
 * - Plain object with seconds/nanoseconds
 * - Already converted number
 * - Date object
 */
function convertTimestamp(value: any): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  // If it's already a number, return it
  if (typeof value === 'number') {
    return value;
  }

  // If it's a Firestore Timestamp object
  if (value && typeof value === 'object') {
    // Check for Firestore Timestamp instance methods first
    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }

    // Firestore Timestamp has seconds and nanoseconds properties
    // Handle both plain objects and Timestamp instances
    if ('seconds' in value && 'nanoseconds' in value) {
      const seconds = typeof value.seconds === 'number' ? value.seconds : Number(value.seconds);
      const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : Number(value.nanoseconds);
      
      if (!isNaN(seconds)) {
        // Convert to milliseconds: seconds * 1000 + nanoseconds / 1,000,000
        const milliseconds = seconds * 1000 + Math.floor(nanoseconds / 1000000);
        return milliseconds;
      }
    }

    // Handle Firestore REST API timestamp format: { "type": "firestore/timestamp/1.0", "seconds": ..., "nanoseconds": ... }
    if (value.type === 'firestore/timestamp/1.0' && 'seconds' in value) {
      const seconds = typeof value.seconds === 'number' ? value.seconds : Number(value.seconds);
      const nanoseconds = value.nanoseconds || 0;
      
      if (!isNaN(seconds)) {
        return seconds * 1000 + Math.floor(nanoseconds / 1000000);
      }
    }
  }

  // If it's a Date object
  if (value instanceof Date) {
    return value.getTime();
  }

  // Try to parse as number (fallback)
  const parsed = Number(value);
  if (!isNaN(parsed) && isFinite(parsed)) {
    return parsed;
  }

  console.warn('Failed to convert timestamp:', value);
  return null;
}

/**
 * Firestore document data types (id is included as a field for reference, even though it's also the document ID)
 */
export interface FirestoreStoryData {
  id: string; // Story ID (also used as document ID, but stored as field for reference)
  userId: string;
  title: string;
  description: string | null;
  length: string;
  theme: string;
  tone: string;
  pov: string;
  targetAudience: string;
  setting: string | null;
  timePeriod: string | null;
  status: string;
  generatedContent: string | null;
  generatedAt: number | null;
  wordCount: number | null;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface FirestoreCharacterData {
  id: string; // Character ID (also used as document ID, but stored as field for reference)
  userId: string;
  storyId: string;
  name: string;
  description: string;
  role: string;
  traits: string[];
  backstory: string | null;
  importance: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface FirestoreBlurbData {
  id: string; // Blurb ID (also used as document ID, but stored as field for reference)
  userId: string;
  storyId: string;
  title: string;
  description: string;
  category: string | null;
  importance: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface FirestoreSceneData {
  id: string; // Scene ID (also used as document ID, but stored as field for reference)
  userId: string;
  storyId: string;
  title: string;
  description: string;
  setting: string;
  characters: string[];
  mood: string | null;
  conflictLevel: number | null;
  importance: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface FirestoreChapterData {
  id: string; // Chapter ID (also used as document ID, but stored as field for reference)
  userId: string;
  storyId: string;
  title: string;
  description: string;
  order: number;
  importance: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface FirestoreGeneratedStoryData {
  id: string; // GeneratedStory ID (also used as document ID, but stored as field for reference)
  storyId: string;
  userId: string;
  content: string;
  complexity: string;
  prompt: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

/**
 * Helper: Normalize null/undefined to null for Firestore
 */
function normalizeNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

/**
 * Helper: Normalize null to undefined for TypeScript
 */
function normalizeUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

// ============================================================================
// Story Conversion
// ============================================================================

/**
 * Convert Story (SQLite format) to Firestore format
 */
export function toFirestoreStory(story: Story): FirestoreStoryData {
  return {
    id: story.id, // Include story ID as a field
    userId: story.userId,
    title: story.title,
    description: normalizeNull(story.description),
    length: story.length,
    theme: story.theme,
    tone: story.tone,
    pov: story.pov,
    targetAudience: story.targetAudience,
    setting: normalizeNull(story.setting),
    timePeriod: normalizeNull(story.timePeriod),
    status: story.status,
    generatedContent: normalizeNull(story.generatedContent),
    generatedAt: normalizeNull(story.generatedAt),
    wordCount: normalizeNull(story.wordCount),
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    synced: true, // Always true in Firestore
  };
}

/**
 * Convert Firestore document to Story (SQLite format)
 */
export function fromFirestoreStory(
  docId: string,
  data: FirestoreStoryData | any // Allow any to handle Timestamp objects
): Story {
  // Use id from data if available, otherwise fallback to docId for backwards compatibility
  const storyId = data.id || docId;
  
  return {
    id: storyId,
    userId: data.userId,
    title: data.title,
    description: normalizeUndefined(data.description),
    length: data.length as Story['length'],
    theme: data.theme as Story['theme'],
    tone: data.tone as Story['tone'],
    pov: data.pov as Story['pov'],
    targetAudience: data.targetAudience as Story['targetAudience'],
    setting: normalizeUndefined(data.setting),
    timePeriod: normalizeUndefined(data.timePeriod),
    status: data.status as Story['status'],
    generatedContent: normalizeUndefined(data.generatedContent),
    generatedAt: convertTimestamp(data.generatedAt) || undefined,
    wordCount: normalizeUndefined(data.wordCount),
    createdAt: convertTimestamp(data.createdAt) || 0,
    updatedAt: convertTimestamp(data.updatedAt) || 0,
    synced: true, // Downloaded from Firestore, so synced
  };
}

// ============================================================================
// Character Conversion
// ============================================================================

/**
 * Convert Character (SQLite format) to Firestore format
 * Note: In SQLite, traits is stored as JSON string, but in TypeScript it's an array
 * The Character type already has traits as an array (parsed from SQLite)
 */
export function toFirestoreCharacter(character: Character): FirestoreCharacterData {
  // Ensure traits is an array (should already be parsed from SQLite)
  const traits = Array.isArray(character.traits)
    ? character.traits
    : safeJsonParse<string[]>(character.traits as any, []);

  return {
    id: character.id, // Include character ID as a field
    userId: character.userId,
    storyId: character.storyId,
    name: character.name,
    description: character.description,
    role: character.role,
    traits, // Array of strings
    backstory: normalizeNull(character.backstory),
    importance: character.importance,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
    synced: true,
    deleted: character.deleted,
  };
}

/**
 * Convert Firestore document to Character (SQLite format)
 */
export function fromFirestoreCharacter(
  docId: string,
  data: FirestoreCharacterData | any // Allow any to handle Timestamp objects
): Character {
  // Use id from data if available, otherwise fallback to docId for backwards compatibility
  const characterId = data.id || docId;
  
  return {
    id: characterId,
    userId: data.userId,
    storyId: data.storyId,
    name: data.name,
    description: data.description,
    role: data.role as Character['role'],
    traits: data.traits, // Already an array
    backstory: normalizeUndefined(data.backstory),
    importance: data.importance,
    createdAt: convertTimestamp(data.createdAt) || 0,
    updatedAt: convertTimestamp(data.updatedAt) || 0,
    synced: true,
    deleted: data.deleted ?? false,
  };
}

// ============================================================================
// Blurb Conversion
// ============================================================================

/**
 * Convert IdeaBlurb (SQLite format) to Firestore format
 */
export function toFirestoreBlurb(blurb: IdeaBlurb): FirestoreBlurbData {
  return {
    id: blurb.id, // Include blurb ID as a field
    userId: blurb.userId,
    storyId: blurb.storyId,
    title: blurb.title,
    description: blurb.description,
    category: normalizeNull(blurb.category),
    importance: blurb.importance,
    createdAt: blurb.createdAt,
    updatedAt: blurb.updatedAt,
    synced: true,
    deleted: blurb.deleted,
  };
}

/**
 * Convert Firestore document to IdeaBlurb (SQLite format)
 */
export function fromFirestoreBlurb(
  docId: string,
  data: FirestoreBlurbData | any // Allow any to handle Timestamp objects
): IdeaBlurb {
  // Use id from data if available, otherwise fallback to docId for backwards compatibility
  const blurbId = data.id || docId;
  
  return {
    id: blurbId,
    userId: data.userId,
    storyId: data.storyId,
    title: data.title,
    description: data.description,
    category: normalizeUndefined(data.category) as IdeaBlurb['category'] | undefined,
    importance: data.importance,
    createdAt: convertTimestamp(data.createdAt) || 0,
    updatedAt: convertTimestamp(data.updatedAt) || 0,
    synced: true,
    deleted: data.deleted ?? false,
  };
}

// ============================================================================
// Scene Conversion
// ============================================================================

/**
 * Convert Scene (SQLite format) to Firestore format
 * Note: In SQLite, characters is stored as JSON string, but in TypeScript it's an array
 * The Scene type already has characters as an array (parsed from SQLite)
 */
export function toFirestoreScene(scene: Scene): FirestoreSceneData {
  // Ensure characters is an array (should already be parsed from SQLite)
  const characters = Array.isArray(scene.characters)
    ? scene.characters
    : safeJsonParse<string[]>(scene.characters as any, []);

  return {
    id: scene.id, // Include scene ID as a field
    userId: scene.userId,
    storyId: scene.storyId,
    title: scene.title,
    description: scene.description,
    setting: scene.setting,
    characters, // Array of character IDs
    mood: normalizeNull(scene.mood),
    conflictLevel: normalizeNull(scene.conflictLevel),
    importance: scene.importance,
    createdAt: scene.createdAt,
    updatedAt: scene.updatedAt,
    synced: true,
    deleted: scene.deleted,
  };
}

/**
 * Convert Firestore document to Scene (SQLite format)
 */
export function fromFirestoreScene(
  docId: string,
  data: FirestoreSceneData | any // Allow any to handle Timestamp objects
): Scene {
  // Use id from data if available, otherwise fallback to docId for backwards compatibility
  const sceneId = data.id || docId;
  
  return {
    id: sceneId,
    userId: data.userId,
    storyId: data.storyId,
    title: data.title,
    description: data.description,
    setting: data.setting,
    characters: data.characters, // Already an array
    mood: normalizeUndefined(data.mood),
    conflictLevel: normalizeUndefined(data.conflictLevel),
    importance: data.importance,
    createdAt: convertTimestamp(data.createdAt) || 0,
    updatedAt: convertTimestamp(data.updatedAt) || 0,
    synced: true,
    deleted: data.deleted ?? false,
  };
}

// ============================================================================
// Chapter Conversion
// ============================================================================

/**
 * Convert Chapter (SQLite format) to Firestore format
 */
export function toFirestoreChapter(chapter: Chapter): FirestoreChapterData {
  return {
    id: chapter.id, // Include chapter ID as a field
    userId: chapter.userId,
    storyId: chapter.storyId,
    title: chapter.title,
    description: chapter.description,
    order: chapter.order,
    importance: chapter.importance,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
    synced: true,
    deleted: chapter.deleted,
  };
}

/**
 * Convert Firestore document to Chapter (SQLite format)
 */
export function fromFirestoreChapter(
  docId: string,
  data: FirestoreChapterData | any // Allow any to handle Timestamp objects
): Chapter {
  // Use id from data if available, otherwise fallback to docId for backwards compatibility
  const chapterId = data.id || docId;
  
  return {
    id: chapterId,
    userId: data.userId,
    storyId: data.storyId,
    title: data.title,
    description: data.description,
    order: data.order,
    importance: data.importance,
    createdAt: convertTimestamp(data.createdAt) || 0,
    updatedAt: convertTimestamp(data.updatedAt) || 0,
    synced: true,
    deleted: data.deleted ?? false,
  };
}

// ============================================================================
// GeneratedStory Conversion
// ============================================================================

/**
 * Convert GeneratedStory (SQLite format) to Firestore format
 */
export function toFirestoreGeneratedStory(
  generatedStory: GeneratedStory
): FirestoreGeneratedStoryData {
  return {
    id: generatedStory.id, // Include generatedStory ID as a field
    storyId: generatedStory.storyId,
    userId: generatedStory.userId,
    content: generatedStory.content,
    complexity: generatedStory.complexity,
    prompt: generatedStory.prompt,
    wordCount: generatedStory.wordCount,
    createdAt: generatedStory.createdAt,
    updatedAt: generatedStory.updatedAt,
    synced: true,
  };
}

/**
 * Convert Firestore document to GeneratedStory (SQLite format)
 */
export function fromFirestoreGeneratedStory(
  docId: string,
  data: FirestoreGeneratedStoryData | any // Allow any to handle Timestamp objects
): GeneratedStory {
  // Use id from data if available, otherwise fallback to docId for backwards compatibility
  const generatedStoryId = data.id || docId;
  
  return {
    id: generatedStoryId,
    storyId: data.storyId,
    userId: data.userId,
    content: data.content,
    complexity: data.complexity as GeneratedStory['complexity'],
    prompt: data.prompt,
    wordCount: data.wordCount,
    createdAt: convertTimestamp(data.createdAt) || 0,
    updatedAt: convertTimestamp(data.updatedAt) || 0,
    synced: true,
  };
}
