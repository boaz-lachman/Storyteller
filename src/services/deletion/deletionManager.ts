/**
 * Deletion Manager
 * Handles delayed deletions with undo support
 * Executes deletion only after a delay if undo hasn't been pressed
 */
import { store } from '../../store';
import { showSnackbar, executeUndo, hideSnackbar } from '../../store/slices/uiSlice';

type EntityType = 'story' | 'character' | 'blurb' | 'scene';

interface PendingDeletion {
  entityId: string;
  entityType: EntityType;
  entity: any; // The entity data for restoring
  timeoutId: NodeJS.Timeout;
  cancelled: boolean;
}

class DeletionManager {
  private pendingDeletions: Map<string, PendingDeletion> = new Map();
  private defaultDelay = 5000; // 5 seconds

  /**
   * Schedule a delayed deletion
   * @param entityId - ID of entity to delete
   * @param entityType - Type of entity
   * @param entity - The entity data (for undo/restore)
   * @param onDelete - Callback to execute actual deletion
   * @param delay - Delay in milliseconds (default: 5000)
   */
  scheduleDeletion(
    entityId: string,
    entityType: EntityType,
    entity: any,
    onDelete: () => Promise<void>,
    delay: number = this.defaultDelay
  ): void {
    // Cancel any existing pending deletion for this entity
    this.cancelDeletion(entityId, entityType);

    const key = `${entityType}:${entityId}`;

    // Schedule the deletion
    const timeoutId = setTimeout(async () => {
      const pending = this.pendingDeletions.get(key);
      
      // Only delete if not cancelled
      if (pending && !pending.cancelled) {
        try {
          await onDelete();
          this.pendingDeletions.delete(key);
          
          // Hide snackbar after deletion completes
          store.dispatch(hideSnackbar());
        } catch (error) {
          console.error(`Error executing delayed deletion for ${entityType} ${entityId}:`, error);
          this.pendingDeletions.delete(key);
          
          // Show error snackbar
          store.dispatch(
            showSnackbar({
              message: `Failed to delete ${entityType}`,
              type: 'error',
            })
          );
        }
      } else {
        // Was cancelled, just clean up
        this.pendingDeletions.delete(key);
      }
    }, delay);

    // Store pending deletion
    this.pendingDeletions.set(key, {
      entityId,
      entityType,
      entity,
      timeoutId,
      cancelled: false,
    });

    // Show snackbar with undo option
    const undoActionType = `undo-${entityType}-delete` as const;
    // Store entity with appropriate key for undo - stories use 'story' key, others use their type
    const data: any = {};
    if (entityType === 'story') {
      data.story = entity;
    } else {
      data[entityType] = entity;
    }
    
    store.dispatch(
      showSnackbar({
        message: `${this.getEntityTypeLabel(entityType)} deleted`,
        type: 'success',
        undoAction: {
          type: undoActionType,
          data,
        },
      })
    );
  }

  /**
   * Cancel a pending deletion (called when undo is pressed)
   * @param entityId - ID of entity
   * @param entityType - Type of entity
   */
  cancelDeletion(entityId: string, entityType?: EntityType): boolean {
    if (entityType) {
      const key = `${entityType}:${entityId}`;
      const pending = this.pendingDeletions.get(key);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pending.cancelled = true;
        this.pendingDeletions.delete(key);
        return true;
      }
    } else {
      // Try all entity types
      const entityTypes: EntityType[] = ['story', 'character', 'blurb', 'scene'];
      for (const type of entityTypes) {
        const key = `${type}:${entityId}`;
        const pending = this.pendingDeletions.get(key);
        if (pending) {
          clearTimeout(pending.timeoutId);
          pending.cancelled = true;
          this.pendingDeletions.delete(key);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get entity type label for display
   */
  private getEntityTypeLabel(entityType: EntityType): string {
    const labels: Record<EntityType, string> = {
      story: 'Story',
      character: 'Character',
      blurb: 'Blurb',
      scene: 'Scene',
    };
    return labels[entityType] || entityType;
  }

  /**
   * Check if there's a pending deletion for an entity
   */
  hasPendingDeletion(entityId: string, entityType?: EntityType): boolean {
    if (entityType) {
      return this.pendingDeletions.has(`${entityType}:${entityId}`);
    } else {
      const entityTypes: EntityType[] = ['story', 'character', 'blurb', 'scene'];
      return entityTypes.some((type) => 
        this.pendingDeletions.has(`${type}:${entityId}`)
      );
    }
  }

  /**
   * Clear all pending deletions (cleanup)
   */
  clearAll(): void {
    for (const pending of this.pendingDeletions.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingDeletions.clear();
  }
}

// Singleton instance
export const deletionManager = new DeletionManager();
