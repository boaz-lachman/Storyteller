/**
 * Story Sharing Service
 * Handles sharing stories with other users via email
 */
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getStoryPermission, getStoryShare } from '../database/storyShares';
import { StoryShare, StoryShareCreateInput } from '../../types';
import {
  createStoryShare,
  updateStoryShare,
  deleteStoryShare,
  getShareByStoryAndUser,
  getSharesForStory,
  markStoryShareSynced,
} from '../database/storyShares';
import { getStory } from '../database/stories';
import { generateId } from '../../utils/helpers';
import { uploadStoryShare, deleteStoryShareFromFirestore } from '../firestore/firestoreService';

/**
 * Register user email in Firestore for email-to-UID lookup
 * Creates/updates emailToUid document: emailToUid/{normalizedEmail} = { uid, email }
 * Also creates/updates users document: users/{uid} = { email }
 * 
 * Should be called on signup and login to ensure emails are findable
 */
export const registerUserEmail = async (uid: string, email: string): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Create/update emailToUid document (document ID = email for fast lookup)
    const emailToUidRef = doc(db, 'emailToUid', normalizedEmail);
    await setDoc(emailToUidRef, {
      uid,
      email: normalizedEmail,
    }, { merge: true });
    
    // Also create/update users document (document ID = UID)
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      email: normalizedEmail,
      uid,
    }, { merge: true });
    
    console.log(`Registered email ${normalizedEmail} for user ${uid}`);
  } catch (error) {
    console.error('Error registering user email:', error);
    // Don't throw - this is a non-critical operation
    // Sharing will still work if email is already registered
  }
};

/**
 * Find user UID by email from Firestore
 * Uses emailToUid collection where document ID is the normalized email
 * and document contains { uid: string, email: string }
 * 
 * Also checks the users collection as a fallback where documents have
 * document ID = UID and contain { email: string }
 */
export const findUserByEmail = async (email: string): Promise<string | null> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // First, try emailToUid collection (more efficient - direct document lookup)
    // Structure: emailToUid/{normalizedEmail} = { uid: string, email: string }
    const emailToUidRef = doc(db, 'emailToUid', normalizedEmail);
    const emailToUidDoc = await getDoc(emailToUidRef);
    
    if (emailToUidDoc.exists()) {
      const emailToUidData = emailToUidDoc.data();
      if (emailToUidData?.uid) {
        return emailToUidData.uid as string;
      }
    }
    
    // Fallback: Try users collection (document ID = UID, contains { email: string })
    // Query users collection where email matches
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('email', '==', normalizedEmail));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      // Document ID is the UID
      return usersSnapshot.docs[0].id;
    }

    // User not found in Firestore
    // Note: Firebase client SDK doesn't support querying Auth users by email directly
    // This requires either:
    // 1. A Firestore collection mapping emails to UIDs (emailToUid or users)
    // 2. A Cloud Function/backend service
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

/**
 * Share a story with a user by email
 */
export const shareStoryWithEmail = async (
  currentUserId: string,
  storyId: string,
  email: string,
  permission: 'read' | 'read-write'
): Promise<StoryShare> => {
  // Get story to verify ownership
  const story = await getStory(storyId);
  if (!story) {
    throw new Error('Story not found');
  }

  // Verify user has permission to share (owner or read-write)
  const canShare = await canShareStory(currentUserId, storyId);
  if (!canShare) {
    throw new Error('You do not have permission to share this story');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const sharedWithUserId = await findUserByEmail(normalizedEmail);
  
  if (!sharedWithUserId) {
    // User not found - we'll create the share with email only
    // When the user signs up/logs in, they can accept the share
    // For now, we'll throw an error asking user to ensure email is registered
    throw new Error(
      'User not found. Please ensure the user has signed up with this email address.'
    );
  }

  // Check if already shared with this user
  const existingShare = await getShareByStoryAndUser(storyId, sharedWithUserId);
  if (existingShare) {
    // Update existing share
    const updated = await updateStoryShare(existingShare.id, {
      permission,
      sharedByUserId: currentUserId,
    });
    if (!updated) {
      throw new Error('Failed to update share');
    }
    
    // Update in Firestore immediately
    try {
      await uploadStoryShare(updated);
      // Mark as synced after successful upload
      await markStoryShareSynced(updated.id);
    } catch (error) {
      console.error('Failed to update story share in Firestore, will retry during sync:', error);
      // If Firestore update fails, it will be handled by the sync queue
    }
    
    return updated;
  }

  // Create new share
  const shareInput: StoryShareCreateInput = {
    storyId,
    ownerId: story.userId,
    sharedWithUserId,
    sharedWithEmail: normalizedEmail,
    permission,
    sharedByUserId: currentUserId,
  };

  const share = await createStoryShare(shareInput);
  
  // Upload to Firestore immediately
  try {
    await uploadStoryShare(share);
    // Mark as synced after successful upload
    await markStoryShareSynced(share.id);
  } catch (error) {
    console.error('Failed to upload story share to Firestore, will retry during sync:', error);
    // If Firestore upload fails, it will be handled by the sync queue
  }
  
  return share;
};

/**
 * Revoke a share
 */
export const revokeShare = async (
  currentUserId: string,
  shareId: string
): Promise<void> => {
  const share = await getStoryShare(shareId);
  if (!share) {
    throw new Error('Share not found');
  }

  const story = await getStory(share.storyId);
  if (!story) {
    throw new Error('Story not found');
  }

  // Only owner or the person who shared can revoke
  const canRevoke =
    story.userId === currentUserId || share.sharedByUserId === currentUserId;
  
  if (!canRevoke) {
    throw new Error('You do not have permission to revoke this share');
  }

  await deleteStoryShare(shareId);
};

/**
 * Revoke share by story and user
 */
export const revokeShareByStoryAndUser = async (
  currentUserId: string,
  storyId: string,
  targetUserId: string
): Promise<void> => {
  const share = await getShareByStoryAndUser(storyId, targetUserId);
  if (!share) {
    throw new Error('Share not found');
  }

  const story = await getStory(storyId);
  if (!story) {
    throw new Error('Story not found');
  }

  // Only owner or the person who shared can revoke
  const canRevoke =
    story.userId === currentUserId || share.sharedByUserId === currentUserId;
  
  if (!canRevoke) {
    throw new Error('You do not have permission to revoke this share');
  }

  // Delete from Firestore first, then locally
  try {
    await deleteStoryShareFromFirestore(share.id);
  } catch (error) {
    console.error('Failed to delete story share from Firestore, will retry during sync:', error);
    // If Firestore delete fails, still delete locally and let sync handle it
  }
  
  await deleteStoryShare(share.id);
};

/**
 * Update share permission
 */
export const updateSharePermission = async (
  currentUserId: string,
  shareId: string,
  permission: 'read' | 'read-write'
): Promise<StoryShare> => {
  const share = await getStoryShare(shareId);
  if (!share) {
    throw new Error('Share not found');
  }

  const story = await getStory(share.storyId);
  if (!story) {
    throw new Error('Story not found');
  }

  // Only owner or person with read-write who shared can update
  const canUpdate =
    story.userId === currentUserId ||
    (share.sharedByUserId === currentUserId && share.permission === 'read-write');
  
  if (!canUpdate) {
    throw new Error('You do not have permission to update this share');
  }

  const updated = await updateStoryShare(shareId, {
    permission,
    sharedByUserId: currentUserId,
  });

  if (!updated) {
    throw new Error('Failed to update share');
  }

  // Update in Firestore immediately
  try {
    await uploadStoryShare(updated);
    // Mark as synced after successful upload
    await markStoryShareSynced(updated.id);
  } catch (error) {
    console.error('Failed to update story share in Firestore, will retry during sync:', error);
    // If Firestore update fails, it will be handled by the sync queue
  }

  return updated;
};

/**
 * Get all shared users for a story
 */
export const getSharedUsers = async (
  storyId: string
): Promise<Array<StoryShare & { userName?: string; userEmail: string }>> => {
  const shares = await getSharesForStory(storyId);
  
  // For now, return shares with email
  // In future, we could fetch user names from Firestore users collection
  return shares.map((share) => ({
    ...share,
    userEmail: share.sharedWithEmail,
  }));
};

/**
 * Check if user can share a story
 */
const canShareStory = async (
  userId: string,
  storyId: string
): Promise<boolean> => {
  const story = await getStory(storyId);
  if (!story) return false;

  // Owner can always share
  if (story.userId === userId) return true;

  // Check if user has read-write permission
  const permission = await getStoryPermission(userId, storyId);
  return permission === 'read-write';
};
