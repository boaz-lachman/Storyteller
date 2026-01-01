// Core entity interface
interface BaseEntity {
    id: string;
    userId: string;
    storyId: string;  // Link to parent story
    importance: number; // 1-10 scale
    createdAt: number;
    updatedAt: number;
    synced: boolean;
    deleted: boolean;
  }
  
  interface Story {
    id: string;
    userId: string;
    title: string;
    description?: string;
    // Story attributes
    length: 'short-story' | 'novella' | 'novel';
    theme: 'horror' | 'comedy' | 'drama' | 'sci-fi' | 'fantasy' | 'romance' | 'thriller' | 'mystery';
    tone: 'light' | 'dark' | 'neutral' | 'satirical' | 'serious';
    pov: 'first-person' | 'second-person' | 'third-person-limited' | 'third-person-omniscient';
    targetAudience: 'children' | 'young-adult' | 'adult';
    setting?: string;
    timePeriod?: string;
    // Status
    status: 'draft' | 'in-progress' | 'completed';
    generatedContent?: string;
    generatedAt?: number;
    wordCount?: number;
    createdAt: number;
    updatedAt: number;
    synced: boolean;
  }
  
  interface Character extends BaseEntity {
    name: string;
    description: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    traits: string;
    backstory?: string;
    imageUri?: string;
  }
  
  interface IdeaBlurb extends BaseEntity {
    title: string;
    description: string;
    tags?: string[];
    category?: 'plot-point' | 'conflict' | 'theme' | 'setting' | 'other';
  }
  
  interface Scene extends BaseEntity {
    title: string;
    description: string;
    setting: string;
    characters: string[]; // Character IDs
    mood?: string;
    conflictLevel?: number; // 1-10
  }
  
  interface Chapter extends BaseEntity {
    title: string;
    summary: string;
    sceneIds: string[]; // Ordered scene IDs
    order: number; // Chapter number
  }

  export type { BaseEntity, Story, Character, IdeaBlurb, Scene, Chapter };