/**
 * SQLite database service
 * Handles database initialization, migrations, and CRUD operations
 */
import * as SQLite from 'expo-sqlite';
import { getCurrentTimestamp } from '../../utils/helpers';

const DB_NAME = 'storyteller.db';
const CURRENT_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create database connection
 */
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabase(db);
  return db;
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
    console.error('Error getting current version:', error);
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
    try {
      await executeMigration(database, version);
    } catch (error) {
      console.error(`Migration ${version} failed:`, error);
      throw error;
    }
  }
}

/**
 * Execute a single migration
 */
async function executeMigration(
  database: SQLite.SQLiteDatabase,
  version: number
): Promise<void> {
  try {
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
      conflictLevel INTEGER CHECK(conflictLevel IS NULL OR (conflictLevel >= 1 AND conflictLevel <= 10)),
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
    CREATE INDEX IF NOT EXISTS idx_characters_importance ON Characters(importance);
    CREATE INDEX IF NOT EXISTS idx_characters_role ON Characters(role);
    CREATE INDEX IF NOT EXISTS idx_characters_createdAt ON Characters(createdAt);
    CREATE INDEX IF NOT EXISTS idx_characters_updatedAt ON Characters(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_characters_synced ON Characters(synced);
    CREATE INDEX IF NOT EXISTS idx_characters_storyId_importance ON Characters(storyId, importance);
    
    CREATE INDEX IF NOT EXISTS idx_blurbs_storyId ON Blurbs(storyId);
    CREATE INDEX IF NOT EXISTS idx_blurbs_importance ON Blurbs(importance);
    CREATE INDEX IF NOT EXISTS idx_blurbs_category ON Blurbs(category);
    CREATE INDEX IF NOT EXISTS idx_blurbs_createdAt ON Blurbs(createdAt);
    CREATE INDEX IF NOT EXISTS idx_blurbs_updatedAt ON Blurbs(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_blurbs_synced ON Blurbs(synced);
    CREATE INDEX IF NOT EXISTS idx_blurbs_storyId_category ON Blurbs(storyId, category);
    CREATE INDEX IF NOT EXISTS idx_blurbs_storyId_importance ON Blurbs(storyId, importance);
    
    CREATE INDEX IF NOT EXISTS idx_scenes_storyId ON Scenes(storyId);
    CREATE INDEX IF NOT EXISTS idx_scenes_importance ON Scenes(importance);
    CREATE INDEX IF NOT EXISTS idx_scenes_createdAt ON Scenes(createdAt);
    CREATE INDEX IF NOT EXISTS idx_scenes_updatedAt ON Scenes(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_scenes_synced ON Scenes(synced);
    CREATE INDEX IF NOT EXISTS idx_scenes_storyId_importance ON Scenes(storyId, importance);
    
    CREATE INDEX IF NOT EXISTS idx_chapters_storyId ON Chapters(storyId);
    CREATE INDEX IF NOT EXISTS idx_chapters_importance ON Chapters(importance);
    CREATE INDEX IF NOT EXISTS idx_chapters_createdAt ON Chapters(createdAt);
    CREATE INDEX IF NOT EXISTS idx_chapters_updatedAt ON Chapters(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_chapters_synced ON Chapters(synced);
    CREATE INDEX IF NOT EXISTS idx_chapters_storyId_order ON Chapters(storyId, "order");
    CREATE INDEX IF NOT EXISTS idx_chapters_storyId_importance ON Chapters(storyId, importance);
    -- Partial unique index: only applies to non-deleted chapters
    -- This allows multiple deleted chapters to have order = -1
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_storyId_order_unique ON Chapters(storyId, "order") WHERE deleted = 0;
    
    CREATE INDEX IF NOT EXISTS idx_generatedStories_storyId ON GeneratedStories(storyId);
    CREATE INDEX IF NOT EXISTS idx_generatedStories_createdAt ON GeneratedStories(createdAt);
    CREATE INDEX IF NOT EXISTS idx_generatedStories_updatedAt ON GeneratedStories(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_generatedStories_synced ON GeneratedStories(synced);
  `;
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

// Export database instance getter for use in CRUD operations
export { getDatabase as getDb };
