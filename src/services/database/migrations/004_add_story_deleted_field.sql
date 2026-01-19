-- Migration 004: Add deleted field to Stories table
-- Description: Enable soft delete for stories to support sync of deleted stories

PRAGMA foreign_keys = ON;

-- Add deleted column to Stories table (idempotent)
-- Note: SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we check first in code
