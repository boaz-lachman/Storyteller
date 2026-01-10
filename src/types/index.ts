/**
 * Core entity interfaces and types
 */

// Core entity interface
export interface BaseEntity {
  id: string;
  userId: string;
  storyId: string; // Link to parent story
  importance: number; // 1-10 scale
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  deleted: boolean;
}

export interface Story {
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
  status: 'draft' | 'completed';
  generatedContent?: string;
  generatedAt?: number;
  wordCount?: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface Character extends BaseEntity {
  name: string;
  description: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  traits: string[];
  backstory?: string;
}

export interface IdeaBlurb extends BaseEntity {
  title: string;
  description: string;
  category?: 'plot-point' | 'conflict' | 'theme' | 'setting' | 'other';
}

export interface Scene extends BaseEntity {
  title: string;
  description: string;
  setting: string;
  characters: string[]; // Character IDs
  mood?: string;
  conflictLevel?: number; // 1-10
}

export interface Chapter extends BaseEntity {
  title: string;
  description: string;
  order: number; // Chapter number
}

/**
 * Generated story interface
 */
export interface GeneratedStory {
  id: string;
  storyId: string;
  userId: string;
  content: string;
  complexity: 'simple' | 'moderate' | 'complex';
  prompt: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

/**
 * Re-export API types
 */
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  ApiRequestConfig,
  ApiState,
  MutationResponse,
  QueryParams,
} from './api';

/**
 * Re-export Form types
 */
export type {
  FormState,
  FormFieldState,
  FormFieldError,
  ValidationResult,
  ValidationRule,
  ValidationSchema,
  FormSubmitHandler,
  FormChangeHandler,
  FormBlurHandler,
  FormResetHandler,
  StoryFormValues,
  CharacterFormValues,
  BlurbFormValues,
  SceneFormValues,
  ChapterFormValues,
  LoginFormValues,
  SignupFormValues,
  ForgotPasswordFormValues,
  StoryGenerationFormValues,
} from './forms';

/**
 * Re-export Navigation types
 */
export type {
  RootStackParamList,
  AuthStackParamList,
  AppStackParamList,
  StoryTabParamList,
} from './navigation';

/**
 * Story Creation/Update Types
 */
export type StoryCreateInput = Omit<
  Story,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'synced'
>;

export type StoryUpdateInput = Partial<StoryCreateInput>;

/**
 * Character Creation/Update Types
 */
export type CharacterCreateInput = Omit<
  Character,
  'id' | 'userId' | 'storyId' | 'createdAt' | 'updatedAt' | 'synced' | 'deleted'
>;

export type CharacterUpdateInput = Partial<CharacterCreateInput>;

/**
 * Blurb Creation/Update Types
 */
export type BlurbCreateInput = Omit<
  IdeaBlurb,
  'id' | 'userId' | 'storyId' | 'createdAt' | 'updatedAt' | 'synced' | 'deleted'
>;

export type BlurbUpdateInput = Partial<BlurbCreateInput>;

/**
 * Scene Creation/Update Types
 */
export type SceneCreateInput = Omit<
  Scene,
  'id' | 'userId' | 'storyId' | 'createdAt' | 'updatedAt' | 'synced' | 'deleted'
>;

export type SceneUpdateInput = Partial<SceneCreateInput>;

/**
 * Chapter Creation/Update Types
 */
export type ChapterCreateInput = Omit<
  Chapter,
  'id' | 'userId' | 'storyId' | 'createdAt' | 'updatedAt' | 'synced' | 'deleted' | 'order'
> & {
  order?: number; // Optional - will be auto-assigned if not provided
};

export type ChapterUpdateInput = Partial<ChapterCreateInput>;

/**
 * Story Generation Types
 */
export interface StoryGenerationRequest {
  storyId: string;
  complexity: 'simple' | 'moderate' | 'complex';
  style?: string;
  additionalInstructions?: string;
}

export interface StoryGenerationResponse {
  content: string;
  wordCount: number;
  prompt: string;
}

/**
 * Sync Types
 */
export interface SyncQueueItem {
  id: string;
  type: 'story' | 'character' | 'blurb' | 'scene' | 'chapter' | 'generatedStory';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  data?: any;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingItems: number;
  error?: string;
}

/**
 * Filter and Sort Types
 */
export interface StoryFilters {
  theme?: Story['theme'];
  length?: Story['length'];
  status?: Story['status'];
  searchQuery?: string;
}

export type SortBy = 'createdAt' | 'updatedAt' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  sortBy: SortBy;
  sortOrder: SortOrder;
}

/**
 * Statistics Types
 */
export interface StoryStatistics {
  characterCount: number;
  blurbCount: number;
  sceneCount: number;
  chapterCount: number;
  totalWords: number;
  completionPercentage: number;
}


/**
 * Utility Types
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

/**
 * Database Types
 */
export interface DatabaseEntity extends BaseEntity {
  _localId?: string; // Internal SQLite row ID
}

/**
 * Export Types
 */
export type ExportFormat = 'pdf' | 'txt';
export type ExportType = 'full-story' | 'elements-only' | 'generated-only';

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  includeMetadata?: boolean;
}
