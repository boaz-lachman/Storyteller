/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions for a story
 */
import React, { useEffect, useState } from 'react';
import { Story, StoryPermission } from '../../types';
import { canEditStory, canDeleteStory, canShareStory } from '../../utils/permissions';
import { useAuth } from '../../hooks/useAuth';

export interface PermissionGuardProps {
  story: Story;
  permission: 'edit' | 'delete' | 'share' | StoryPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideOnNoPermission?: boolean; // If true, renders nothing instead of fallback
}

/**
 * Permission Guard Component
 * Checks user permissions and conditionally renders children
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  story,
  permission,
  children,
  fallback = null,
  hideOnNoPermission = false,
}) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        let result = false;

        // If permission is a specific action, check accordingly
        if (permission === 'edit') {
          result = await canEditStory(user.uid, story);
        } else if (permission === 'delete') {
          result = await canDeleteStory(user.uid, story);
        } else if (permission === 'share') {
          result = await canShareStory(user.uid, story);
        } else {
          // If permission is a StoryPermission type, check if user has that level or higher
          const userPermission = story.permission || (story.userId === user.uid ? 'owner' : null);
          
          if (userPermission === 'owner') {
            result = true; // Owner has all permissions
          } else if (userPermission === 'read-write') {
            result = permission === 'read-write' || permission === 'read';
          } else if (userPermission === 'read') {
            result = permission === 'read';
          } else {
            result = false;
          }
        }

        setHasPermission(result);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [user, story, permission]);

  // Show loading state if checking permissions
  if (loading) {
    return null;
  }

  // If user doesn't have permission
  if (!hasPermission) {
    if (hideOnNoPermission) {
      return null;
    }
    return <>{fallback}</>;
  }

  // User has permission, render children
  return <>{children}</>;
};
