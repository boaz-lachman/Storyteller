/**
 * SQLite database service
 * Handles database initialization, migrations, and CRUD operations
 */
import * as SQLite from 'expo-sqlite';
import { getCurrentTimestamp } from '../../utils/helpers';

const DB_NAME = 'storyteller.db';
const CURRENT_VERSION = 8;

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get or create database connection
 * Prevents concurrent initialization attempts
 */
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  // If database is already initialized, return it
  if (db) {
    try {
      // Verify the database is still valid by trying a simple query
      await db.getFirstAsync('SELECT 1');
      return db;
    } catch (error) {
      // Database connection is stale or invalid, reset and reinitialize
      console.warn('Database connection is stale, reinitializing...');
      db = null;
      isInitializing = false;
      initializationPromise = null;
    }
  }

  // If initialization is in progress, wait for it to complete
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync(DB_NAME);
      await initializeDatabase(db);
      isInitializing = false;
      initializationPromise = null;
      return db;
    } catch (error) {
      console.error('Error initializing database:', error);
      db = null; // Reset on error
      isInitializing = false;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};

/**
 * Initialize database with schema and migrations
 */
async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Enable foreign keys
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // Check current version
    const currentVersion = await getCurrentVersion(database);

    if (currentVersion < CURRENT_VERSION) {
      // Run migrations
      await runMigrations(database, currentVersion, CURRENT_VERSION);
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

/**
 * Get current database version
 */
async function getCurrentVersion(
  database: SQLite.SQLiteDatabase
): Promise<number> {
  try {
    // Check if schema_version table exists
    const result = await database.getFirstAsync<{ version: number }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    );

    if (!result) {
      return 0; // No version table means fresh database
    }

    const version = await database.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_version'
    );

    return version?.version || 0;
  } catch (error) {
    console.error('Error getting database version:', error);
    return 0;
  }
}

/**
 * Run migrations from current version to target version
 */
async function runMigrations(
  database: SQLite.SQLiteDatabase,
  fromVersion: number,
  toVersion: number
): Promise<void> {
  for (let version = fromVersion + 1; version <= toVersion; version++) {
    await applyMigration(database, version);
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(
  database: SQLite.SQLiteDatabase,
  version: number
): Promise<void> {
  try {
    // Special handling for migration 002 to avoid duplicate column error
    if (version === 2) {
      await database.withTransactionAsync(async () => {
        await applyMigration002Safe(database);
        
        // Record migration
        await database.runAsync(
          'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
          [version, getCurrentTimestamp(), `Migration ${version}`]
        );
      });
      console.log(`Migration ${version} applied successfully`);
      return;
    }

    // Special handling for migration 004 to avoid duplicate column error
    if (version === 4) {
      await database.withTransactionAsync(async () => {
        await applyMigration004Safe(database);
        
        // Record migration
        await database.runAsync(
          'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
          [version, getCurrentTimestamp(), `Migration ${version}`]
        );
      });
      console.log(`Migration ${version} applied successfully`);
      return;
    }

    // Special handling for migration 005 to avoid duplicate column error
    if (version === 5) {
      await database.withTransactionAsync(async () => {
        await applyMigration005Safe(database);
        
        // Record migration
        await database.runAsync(
          'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
          [version, getCurrentTimestamp(), `Migration ${version}`]
        );
      });
      console.log(`Migration ${version} applied successfully`);
      return;
    }

    // Special handling for migration 008 to avoid duplicate column error
    if (version === 8) {
      await database.withTransactionAsync(async () => {
        await applyMigration008Safe(database);
        
        // Record migration
        await database.runAsync(
          'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
          [version, getCurrentTimestamp(), `Migration ${version}`]
        );
      });
      console.log(`Migration ${version} applied successfully`);
      return;
    }

    // Import migration SQL
    const migrationSQL = await getMigrationSQL(version);
    
    if (!migrationSQL) {
      throw new Error(`Migration ${version} not found`);
    }

    // Execute migration in transaction
    await database.withTransactionAsync(async () => {
      // Execute migration SQL
      await database.execAsync(migrationSQL);

      // Record migration
      await database.runAsync(
        'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)',
        [version, getCurrentTimestamp(), `Migration ${version}`]
      );
    });

    console.log(`Migration ${version} applied successfully`);
  } catch (error) {
    console.error(`Error executing migration ${version}:`, error);
    throw error;
  }
}

/**
 * Get migration SQL for a version
 */
async function getMigrationSQL(version: number): Promise<string | null> {
  try {
    // For now, we'll use inline SQL. In production, you might load from files
    if (version === 1) {
      // For now, return the SQL as a string constant since dynamic import doesn't work
      return getInitialSchemaSQL();
    }
    if (version === 2) {
      return getMigration002SQL();
    }
    if (version === 3) {
      return getMigration003SQL();
    }
    if (version === 4) {
      return getMigration004SQL();
    }
    if (version === 5) {
      return getMigration005SQL();
    }
    if (version === 6) {
      return getMigration006SQL();
    }
    if (version === 7) {
      return getMigration007SQL();
    }
    if (version === 8) {
      return getMigration008SQL();
    }
    return null;
  } catch (error) {
    console.error(`Error loading migration ${version}:`, error);
    return null;
  }
}

/**
 * Initial schema SQL (Migration 001)
 */
function getInitialSchemaSQL(): string {
  // This would normally be loaded from the migration file
  // For now, we'll inline it. In production, use a proper SQL loader
  return `
    -- Migration 001: Initial Schema
    PRAGMA foreign_keys = ON;
    
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      description TEXT
    );
    
    CREATE TABLE IF NOT EXISTS Stories (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      length TEXT NOT NULL,
      theme TEXT NOT NULL,
      tone TEXT NOT NULL,
      pov TEXT NOT NULL,
      targetAudience TEXT NOT NULL,
      setting TEXT,
      timePeriod TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      generatedContent TEXT,
      generatedAt INTEGER,
      wordCount INTEGER,
      cutOffChunks TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS Characters (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      storyId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      role TEXT NOT NULL,
      traits TEXT NOT NULL,
      backstory TEXT,
      keyEvents TEXT,
      importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS Blurbs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      storyId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS Scenes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      storyId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      setting TEXT NOT NULL,
      characters TEXT NOT NULL,
      mood TEXT,
      conflictLevel INTEGER CHECK(conflictLevel >= 1 AND conflictLevel <= 10),
      importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS Chapters (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      storyId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS GeneratedStories (
      id TEXT PRIMARY KEY,
      storyId TEXT NOT NULL,
      userId TEXT NOT NULL,
      content TEXT NOT NULL,
      complexity TEXT NOT NULL,
      prompt TEXT NOT NULL,
      wordCount INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
    );
    
    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_stories_userId ON Stories(userId);
    CREATE INDEX IF NOT EXISTS idx_stories_userId_status ON Stories(userId, status);
    CREATE INDEX IF NOT EXISTS idx_stories_createdAt ON Stories(createdAt);
    CREATE INDEX IF NOT EXISTS idx_stories_updatedAt ON Stories(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_stories_synced ON Stories(synced);
    
    CREATE INDEX IF NOT EXISTS idx_characters_storyId ON Characters(storyId);
    CREATE INDEX IF NOT EXISTS idx_characters_userId ON Characters(userId);
    CREATE INDEX IF NOT EXISTS idx_characters_createdAt ON Characters(createdAt);
    CREATE INDEX IF NOT EXISTS idx_characters_updatedAt ON Characters(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_characters_synced ON Characters(synced);
    CREATE INDEX IF NOT EXISTS idx_characters_deleted ON Characters(deleted);
    CREATE INDEX IF NOT EXISTS idx_characters_storyId_importance ON Characters(storyId, importance);
    
    CREATE INDEX IF NOT EXISTS idx_blurbs_storyId ON Blurbs(storyId);
    CREATE INDEX IF NOT EXISTS idx_blurbs_userId ON Blurbs(userId);
    CREATE INDEX IF NOT EXISTS idx_blurbs_createdAt ON Blurbs(createdAt);
    CREATE INDEX IF NOT EXISTS idx_blurbs_updatedAt ON Blurbs(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_blurbs_synced ON Blurbs(synced);
    CREATE INDEX IF NOT EXISTS idx_blurbs_deleted ON Blurbs(deleted);
    CREATE INDEX IF NOT EXISTS idx_blurbs_storyId_importance ON Blurbs(storyId, importance);
    
    CREATE INDEX IF NOT EXISTS idx_scenes_storyId ON Scenes(storyId);
    CREATE INDEX IF NOT EXISTS idx_scenes_userId ON Scenes(userId);
    CREATE INDEX IF NOT EXISTS idx_scenes_createdAt ON Scenes(createdAt);
    CREATE INDEX IF NOT EXISTS idx_scenes_updatedAt ON Scenes(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_scenes_synced ON Scenes(synced);
    CREATE INDEX IF NOT EXISTS idx_scenes_deleted ON Scenes(deleted);
    CREATE INDEX IF NOT EXISTS idx_scenes_storyId_importance ON Scenes(storyId, importance);
    
    CREATE INDEX IF NOT EXISTS idx_chapters_storyId ON Chapters(storyId);
    CREATE INDEX IF NOT EXISTS idx_chapters_userId ON Chapters(userId);
    CREATE INDEX IF NOT EXISTS idx_chapters_createdAt ON Chapters(createdAt);
    CREATE INDEX IF NOT EXISTS idx_chapters_updatedAt ON Chapters(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_chapters_synced ON Chapters(synced);
    CREATE INDEX IF NOT EXISTS idx_chapters_deleted ON Chapters(deleted);
    CREATE INDEX IF NOT EXISTS idx_chapters_storyId_importance ON Chapters(storyId, importance);
    -- Partial unique index: only applies to non-deleted chapters
    -- This allows multiple deleted chapters to have order = -1
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_storyId_order_unique ON Chapters(storyId, "order") WHERE deleted = 0;
    
    CREATE INDEX IF NOT EXISTS idx_generatedStories_storyId ON GeneratedStories(storyId);
    CREATE INDEX IF NOT EXISTS idx_generatedStories_createdAt ON GeneratedStories(createdAt);
    CREATE INDEX IF NOT EXISTS idx_generatedStories_updatedAt ON GeneratedStories(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_generatedStories_synced ON GeneratedStories(synced);
    
    -- Sync Queue Table
    CREATE TABLE IF NOT EXISTS SyncQueue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('story', 'character', 'blurb', 'scene', 'chapter', 'generatedStory', 'storyShare', 'storyComment')),
      entityId TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
      timestamp INTEGER NOT NULL,
      retryCount INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      data TEXT,
      createdAt INTEGER NOT NULL
    );
    
    -- Sync Queue indexes
    CREATE INDEX IF NOT EXISTS idx_syncQueue_type ON SyncQueue(type);
    CREATE INDEX IF NOT EXISTS idx_syncQueue_entityId ON SyncQueue(entityId);
    CREATE INDEX IF NOT EXISTS idx_syncQueue_timestamp ON SyncQueue(timestamp);
    CREATE INDEX IF NOT EXISTS idx_syncQueue_retryCount ON SyncQueue(retryCount);
  `;
}

/**
 * Migration 002: Add cutOffChunks column to Stories table
 * Note: This migration is idempotent - it checks if the column exists before adding it
 */
function getMigration002SQL(): string {
  return `
    -- Migration 002: Add cutOffChunks column to Stories table
    -- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for ADD COLUMN)
    -- We'll catch the error if column already exists
    ALTER TABLE Stories ADD COLUMN cutOffChunks TEXT;
  `;
}

/**
 * Safe migration 002: Checks if column exists before adding
 */
async function applyMigration002Safe(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if cutOffChunks column exists
    const tableInfo = await database.getAllAsync<{ name: string; type: string }>(
      'PRAGMA table_info(Stories)'
    );
    const hasCutOffChunks = tableInfo.some(col => col.name === 'cutOffChunks');
    
    if (!hasCutOffChunks) {
      // Column doesn't exist, add it
      await database.execAsync('ALTER TABLE Stories ADD COLUMN cutOffChunks TEXT;');
      console.log('Migration 002: Added cutOffChunks column to Stories table');
    } else {
      console.log('Migration 002: cutOffChunks column already exists, skipping');
    }
  } catch (error: any) {
    // If error is about duplicate column, ignore it (column already exists)
    if (error?.message?.includes('duplicate column name') || 
        error?.message?.includes('duplicate column')) {
      console.log('Migration 002: cutOffChunks column already exists (caught duplicate error), skipping');
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Migration 003: Add StoryShares table for story sharing functionality
 */
function getMigration003SQL(): string {
  return `
    -- Migration 003: Add StoryShares table for story sharing functionality
    PRAGMA foreign_keys = ON;
    
    CREATE TABLE IF NOT EXISTS StoryShares (
      id TEXT PRIMARY KEY,
      storyId TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      sharedWithUserId TEXT NOT NULL,
      sharedWithEmail TEXT NOT NULL,
      permission TEXT NOT NULL CHECK(permission IN ('read', 'read-write')),
      sharedByUserId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_storyShares_storyId ON StoryShares(storyId);
    CREATE INDEX IF NOT EXISTS idx_storyShares_sharedWithUserId ON StoryShares(sharedWithUserId);
    CREATE INDEX IF NOT EXISTS idx_storyShares_sharedWithEmail ON StoryShares(sharedWithEmail);
    CREATE INDEX IF NOT EXISTS idx_storyShares_synced ON StoryShares(synced);
    CREATE INDEX IF NOT EXISTS idx_storyShares_ownerId ON StoryShares(ownerId);
    CREATE INDEX IF NOT EXISTS idx_storyShares_story_user ON StoryShares(storyId, sharedWithUserId);
  `;
}

/**
 * Migration 004: Add deleted field to Stories table
 * Note: This migration is idempotent - it checks if the column exists before adding it
 */
function getMigration004SQL(): string {
  return `
    -- Migration 004: Add deleted field to Stories table
    -- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for ADD COLUMN)
    -- We'll catch the error if column already exists
    ALTER TABLE Stories ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  `;
}

/**
 * Safe migration 004: Checks if column exists before adding
 */
async function applyMigration004Safe(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if deleted column exists
    const tableInfo = await database.getAllAsync<{ name: string; type: string }>(
      'PRAGMA table_info(Stories)'
    );
    const hasDeleted = tableInfo.some(col => col.name === 'deleted');
    
    if (!hasDeleted) {
      // Column doesn't exist, add it
      await database.execAsync('ALTER TABLE Stories ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;');
      console.log('Migration 004: Added deleted column to Stories table');
    } else {
      console.log('Migration 004: deleted column already exists, skipping');
    }
  } catch (error: any) {
    // If error is about duplicate column, ignore it (column already exists)
    if (error?.message?.includes('duplicate column name') || 
        error?.message?.includes('duplicate column')) {
      console.log('Migration 004: deleted column already exists (caught duplicate error), skipping');
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Migration 005: Add keyEvents column to Characters table
 * Note: This migration is idempotent - it checks if the column exists before adding it
 */
function getMigration005SQL(): string {
  return `
    -- Migration 005: Add keyEvents column to Characters table
    -- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for ADD COLUMN)
    -- We'll catch the error if column already exists
    ALTER TABLE Characters ADD COLUMN keyEvents TEXT;
  `;
}

/**
 * Safe migration 005: Checks if column exists before adding
 */
async function applyMigration005Safe(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if keyEvents column exists
    const tableInfo = await database.getAllAsync<{ name: string; type: string }>(
      'PRAGMA table_info(Characters)'
    );
    const hasKeyEvents = tableInfo.some(col => col.name === 'keyEvents');
    
    if (!hasKeyEvents) {
      // Column doesn't exist, add it
      await database.execAsync('ALTER TABLE Characters ADD COLUMN keyEvents TEXT;');
      console.log('Migration 005: Added keyEvents column to Characters table');
    } else {
      console.log('Migration 005: keyEvents column already exists, skipping');
    }
  } catch (error: any) {
    // If error is about duplicate column, ignore it (column already exists)
    if (error?.message?.includes('duplicate column name') || 
        error?.message?.includes('duplicate column')) {
      console.log('Migration 005: keyEvents column already exists (caught duplicate error), skipping');
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};

/**
 * Clear all data from the database
 * Deletes all data from all tables including SyncQueue and schema_version
 * This is used during logout to ensure no user data remains
 */
export const clearDatabase = async (): Promise<void> => {
  if (!db) {
    db = await getDatabase();
  }

  try {
    // Delete all data from all tables in a transaction
    // This ensures atomicity and that foreign key constraints are respected
    await db.withTransactionAsync(async () => {
      // Clear all content tables
      await db!.execAsync(`
        DELETE FROM SyncQueue;
        DELETE FROM GeneratedStories;
        DELETE FROM Chapters;
        DELETE FROM Scenes;
        DELETE FROM Blurbs;
        DELETE FROM Characters;
        DELETE FROM StoryShares;
        DELETE FROM StoryComments;
        DELETE FROM Stories;
      `);
      
      // Reset schema_version to indicate a fresh database state
      await db!.execAsync(`
        DELETE FROM schema_version;
      `);
    });
    
    console.log('Database cleared successfully - all tables emptied');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

// Export database instance getter for use in CRUD operations
export { getDatabase as getDb };

/**
 * Migration 006: Add StoryComments table for story commenting
 */
function getMigration006SQL(): string {
  return `
    -- Migration 006: Add StoryComments table for story commenting
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS StoryComments (
      id TEXT PRIMARY KEY,
      storyId TEXT NOT NULL,
      authorId TEXT NOT NULL,
      authorEmail TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_storyComments_storyId ON StoryComments(storyId);
    CREATE INDEX IF NOT EXISTS idx_storyComments_authorId ON StoryComments(authorId);
    CREATE INDEX IF NOT EXISTS idx_storyComments_createdAt ON StoryComments(createdAt);
    CREATE INDEX IF NOT EXISTS idx_storyComments_updatedAt ON StoryComments(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_storyComments_synced ON StoryComments(synced);
    CREATE INDEX IF NOT EXISTS idx_storyComments_deleted ON StoryComments(deleted);
    CREATE INDEX IF NOT EXISTS idx_storyComments_story_created ON StoryComments(storyId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_storyComments_story_deleted ON StoryComments(storyId, deleted);
  `;
}

/**
 * Migration 007: Update SyncQueue CHECK constraint for storyComment
 *
 * SQLite cannot alter CHECK constraints; recreate table.
 */
function getMigration007SQL(): string {
  return `
    -- Migration 007: Update SyncQueue CHECK constraint for storyComment
    PRAGMA foreign_keys = OFF;

    CREATE TABLE IF NOT EXISTS SyncQueue_new (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('story', 'character', 'blurb', 'scene', 'chapter', 'generatedStory', 'storyShare', 'storyComment')),
      entityId TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
      timestamp INTEGER NOT NULL,
      retryCount INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      data TEXT,
      createdAt INTEGER NOT NULL
    );

    INSERT INTO SyncQueue_new (id, type, entityId, operation, timestamp, retryCount, lastError, data, createdAt)
    SELECT id, type, entityId, operation, timestamp, retryCount, lastError, data, createdAt
    FROM SyncQueue;

    DROP TABLE SyncQueue;
    ALTER TABLE SyncQueue_new RENAME TO SyncQueue;

    CREATE INDEX IF NOT EXISTS idx_syncQueue_type ON SyncQueue(type);
    CREATE INDEX IF NOT EXISTS idx_syncQueue_entityId ON SyncQueue(entityId);
    CREATE INDEX IF NOT EXISTS idx_syncQueue_timestamp ON SyncQueue(timestamp);
    CREATE INDEX IF NOT EXISTS idx_syncQueue_retryCount ON SyncQueue(retryCount);

    PRAGMA foreign_keys = ON;
  `;
}

/**
 * Migration 008: Add deleted column to StoryComments table
 * Note: This migration is idempotent - it checks if the column exists before adding it
 */
function getMigration008SQL(): string {
  return `
    -- Migration 008: Add deleted column to StoryComments table
    -- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for ADD COLUMN)
    -- We'll catch the error if column already exists
    ALTER TABLE StoryComments ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  `;
}

/**
 * Safe migration 008: Checks if column exists before adding
 */
async function applyMigration008Safe(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if deleted column exists
    const tableInfo = await database.getAllAsync<{ name: string; type: string }>(
      'PRAGMA table_info(StoryComments)'
    );
    const hasDeleted = tableInfo.some(col => col.name === 'deleted');
    
    if (!hasDeleted) {
      // Column doesn't exist, add it
      await database.execAsync('ALTER TABLE StoryComments ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;');
      console.log('Migration 008: Added deleted column to StoryComments table');
      
      // Create indexes for deleted column
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_storyComments_deleted ON StoryComments(deleted);');
      await database.execAsync('CREATE INDEX IF NOT EXISTS idx_storyComments_story_deleted ON StoryComments(storyId, deleted);');
    } else {
      console.log('Migration 008: deleted column already exists, skipping');
    }
  } catch (error: any) {
    // If error is about duplicate column, ignore it (column already exists)
    if (error?.message?.includes('duplicate column name') || 
        error?.message?.includes('duplicate column')) {
      console.log('Migration 008: deleted column already exists (caught duplicate error), skipping');
      return;
    }
    // Re-throw other errors
    throw error;
  }
}
