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

/**
 * Firestore document data types (without id, as id is the document ID)
 */
export interface FirestoreStoryData {
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
  data: FirestoreStoryData
): Story {
  return {
    id: docId,
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
    generatedAt: normalizeUndefined(data.generatedAt),
    wordCount: normalizeUndefined(data.wordCount),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
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
  data: FirestoreCharacterData
): Character {
  return {
    id: docId,
    userId: data.userId,
    storyId: data.storyId,
    name: data.name,
    description: data.description,
    role: data.role as Character['role'],
    traits: data.traits, // Already an array
    backstory: normalizeUndefined(data.backstory),
    importance: data.importance,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
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
  data: FirestoreBlurbData
): IdeaBlurb {
  return {
    id: docId,
    userId: data.userId,
    storyId: data.storyId,
    title: data.title,
    description: data.description,
    category: normalizeUndefined(data.category) as IdeaBlurb['category'] | undefined,
    importance: data.importance,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
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
  data: FirestoreSceneData
): Scene {
  return {
    id: docId,
    userId: data.userId,
    storyId: data.storyId,
    title: data.title,
    description: data.description,
    setting: data.setting,
    characters: data.characters, // Already an array
    mood: normalizeUndefined(data.mood),
    conflictLevel: normalizeUndefined(data.conflictLevel),
    importance: data.importance,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
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
  data: FirestoreChapterData
): Chapter {
  return {
    id: docId,
    userId: data.userId,
    storyId: data.storyId,
    title: data.title,
    description: data.description,
    order: data.order,
    importance: data.importance,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
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
  data: FirestoreGeneratedStoryData
): GeneratedStory {
  return {
    id: docId,
    storyId: data.storyId,
    userId: data.userId,
    content: data.content,
    complexity: data.complexity as GeneratedStory['complexity'],
    prompt: data.prompt,
    wordCount: data.wordCount,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    synced: true,
  };
}
