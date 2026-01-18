/**
 * Share Story Modal Component
 * Modal for managing story shares with other users
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, StatusBar, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Appbar,
  TextInput,
  Button,
  List,
  Chip,
  Divider,
  ActivityIndicator,
  Text,
  IconButton,
} from 'react-native-paper';
import { Story } from '../../types';
import {
  shareStoryWithEmail,
  revokeShareByStoryAndUser,
  updateSharePermission,
  getSharedUsers,
} from '../../services/sharing/storySharingService';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { getSharesForStory } from '../../services/database/storyShares';
import { useAppDispatch } from '../../hooks/redux';
import { setShares, addShare, updateShare, removeShare } from '../../store/slices/storySharesSlice';
import { storiesApi } from '../../store/api/storiesApi';

export interface ShareStoryModalProps {
  visible: boolean;
  onClose: () => void;
  story: Story | null;
}

/**
 * Share Story Modal Component
 */
export const ShareStoryModal: React.FC<ShareStoryModalProps> = ({
  visible,
  onClose,
  story,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'read-write'>('read');
  const [shares, setSharesList] = useState<Array<{ id: string; email: string; permission: 'read' | 'read-write'; userId: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load shares when modal opens or story changes
  useEffect(() => {
    if (visible && story && user) {
      loadShares();
    } else {
      setSharesList([]);
      setEmail('');
      setPermission('read');
    }
  }, [visible, story]);

  const loadShares = async () => {
    if (!story || !user) return;

    try {
      setRefreshing(true);
      const storyShares = await getSharesForStory(story.id);
      
      // Transform to display format
      const sharesData = storyShares.map((share) => ({
        id: share.id,
        email: share.sharedWithEmail,
        permission: share.permission,
        userId: share.sharedWithUserId,
      }));

      setSharesList(sharesData);
      dispatch(setShares({ storyId: story.id, shares: storyShares }));
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = async () => {
    if (!story || !user || !email.trim()) {
      return;
    }

    try {
      setSharing(true);
      const normalizedEmail = email.toLowerCase().trim();
      
      const share = await shareStoryWithEmail(
        user.uid,
        story.id,
        normalizedEmail,
        permission
      );

      // Add to local state
      const newShare = {
        id: share.id,
        email: normalizedEmail,
        permission: share.permission,
        userId: share.sharedWithUserId,
      };
      
      setSharesList((prev) => {
        // Check if already exists (update case)
        const existingIndex = prev.findIndex((s) => s.email === normalizedEmail);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newShare;
          return updated;
        }
        return [...prev, newShare];
      });

      dispatch(addShare(share));
      
      // Invalidate story queries to refresh StoryCard and StoryDetailScreen
      dispatch(storiesApi.util.invalidateTags([
        { type: 'Story', id: 'LIST' },
        { type: 'Story', id: story.id },
      ]));
      
      // Clear form
      setEmail('');
      setPermission('read');
      
      Alert.alert(
        t('stories:sharing.shareAdded'),
        '',
        [{ text: t('common:buttons.ok'), onPress: () => {} }]
      );
    } catch (error: any) {
      console.error('Error sharing story:', error);
      Alert.alert(
        t('stories:sharing.shareFailed'),
        error.message || t('stories:sharing.shareFailed'),
        [{ text: t('common:buttons.ok'), onPress: () => {} }]
      );
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (shareId: string, targetUserId: string) => {
    if (!story || !user) return;

      Alert.alert(
        t('stories:sharing.revoke'),
        t('stories:sharing.revoke') + '?',
      [
        { text: t('common:buttons.cancel'), style: 'cancel' },
        {
          text: t('stories:sharing.revoke'),
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeShareByStoryAndUser(user.uid, story.id, targetUserId);
              
              // Remove from local state
              setSharesList((prev) => prev.filter((s) => s.id !== shareId));
              dispatch(removeShare({ storyId: story.id, shareId }));
              
              // Invalidate story queries to refresh StoryCard and StoryDetailScreen
              dispatch(storiesApi.util.invalidateTags([
                { type: 'Story', id: 'LIST' },
                { type: 'Story', id: story.id },
              ]));
              
              Alert.alert(
                t('stories:sharing.shareRevoked'),
                '',
                [{ text: t('common:buttons.ok'), onPress: () => {} }]
              );
            } catch (error: any) {
              console.error('Error revoking share:', error);
              Alert.alert(
                t('common:errors.error'),
                error.message || t('common:errors.error'),
                [{ text: t('common:buttons.ok'), onPress: () => {} }]
              );
            }
          },
        },
      ]
    );
  };

  const handleUpdatePermission = async (
    shareId: string,
    currentPermission: 'read' | 'read-write',
    targetUserId: string
  ) => {
    if (!story || !user) return;

    const newPermission = currentPermission === 'read' ? 'read-write' : 'read';

    try {
      const updatedShare = await updateSharePermission(user.uid, shareId, newPermission);
      
      // Update local state
      setSharesList((prev) =>
        prev.map((s) =>
          s.id === shareId ? { ...s, permission: newPermission } : s
        )
      );
      
      dispatch(updateShare(updatedShare));
      
      // Invalidate story queries to refresh StoryCard and StoryDetailScreen
      dispatch(storiesApi.util.invalidateTags([
        { type: 'Story', id: 'LIST' },
        { type: 'Story', id: story.id },
      ]));
      
      Alert.alert(
        t('stories:sharing.shareUpdated'),
        '',
        [{ text: t('common:buttons.ok'), onPress: () => {} }]
      );
    } catch (error: any) {
      console.error('Error updating share:', error);
      Alert.alert(
        t('common:errors.error'),
        error.message || t('common:errors.error'),
        [{ text: t('common:buttons.ok'), onPress: () => {} }]
      );
    }
  };

  if (!story) {
    return null;
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header style={styles.header}>
          <Appbar.Action
            icon="close"
            onPress={onClose}
            iconColor={colors.text}
            theme={{
              colors: {
                primary: colors.primary,
                surface: colors.surface,
                onSurface: colors.text,
              },
            }}
          />
          <Appbar.Content
            title={t('stories:sharing.share')}
            titleStyle={styles.headerTitle}
            color={colors.text}
          />
        </Appbar.Header>
        
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Invite section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('stories:sharing.invite')}</Text>
            
            <TextInput
              label={t('stories:sharing.inviteEmail')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('stories:sharing.inviteEmailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              mode="outlined"
              style={styles.input}
              disabled={sharing}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
              placeholderTextColor={colors.textTertiary}
              theme={{
                colors: {
                  primary: colors.primary,
                  error: colors.error,
                  text: colors.text,
                  placeholder: colors.textTertiary,
                  background: colors.surface,
                },
              }}
            />

            <View style={styles.permissionRow}>
              <Text style={styles.permissionLabel}>{t('stories:sharing.selectPermission')}</Text>
              <View style={styles.chipContainer}>
                <Chip
                  selected={permission === 'read'}
                  onPress={() => setPermission('read')}
                  showSelectedCheck={false}
                  style={[
                    styles.chip,
                    permission === 'read' && styles.chipSelected,
                  ]}
                  selectedColor={colors.primary}
                  textStyle={[
                    styles.chipText,
                    permission === 'read' && styles.chipTextSelected,
                  ]}
                  theme={{
                    colors: {
                      primary: colors.primary,
                      secondary: colors.secondary,
                      surface: colors.surface,
                      onSurface: colors.text,
                    },
                  }}
                >
                  {t('stories:sharing.permission.read')}
                </Chip>
                <Chip
                  selected={permission === 'read-write'}
                  onPress={() => setPermission('read-write')}
                  showSelectedCheck={false}
                  style={[
                    styles.chip,
                    permission === 'read-write' && styles.chipSelected,
                  ]}
                  selectedColor={colors.primary}
                  textStyle={[
                    styles.chipText,
                    permission === 'read-write' && styles.chipTextSelected,
                  ]}
                  theme={{
                    colors: {
                      primary: colors.primary,
                      secondary: colors.secondary,
                      surface: colors.surface,
                      onSurface: colors.text,
                    },
                  }}
                >
                  {t('stories:sharing.permission.readWrite')}
                </Chip>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleShare}
              disabled={!isValidEmail(email) || sharing || loading}
              loading={sharing}
              style={styles.shareButton}
              buttonColor={colors.primary}
              textColor={colors.textInverse}
              labelStyle={styles.buttonLabel}
              theme={{
                colors: {
                  primary: colors.primary,
                  onPrimary: colors.textInverse,
                  error: colors.error,
                  surface: colors.surface,
                  onSurface: colors.text,
                },
              }}
            >
              {t('stories:sharing.share')}
            </Button>
          </View>

          <Divider style={styles.divider} theme={{ colors: { outline: colors.borderLight } }} />

          {/* Current shares section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('stories:sharing.currentShares')}</Text>
            
            {refreshing ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : shares.length === 0 ? (
              <Text style={styles.emptyText}>{t('stories:sharing.noShares')}</Text>
            ) : (
              shares.map((share) => (
                <List.Item
                  key={share.id}
                  title={share.email}
                  description={
                    share.permission === 'read-write'
                      ? t('stories:sharing.permission.readWrite')
                      : t('stories:sharing.permission.read')
                  }
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon="account"
                      color={colors.primary}
                    />
                  )}
                  right={(props) => (
                    <View style={styles.shareActions}>
                      <IconButton
                        {...props}
                        icon="pencil"
                        size={20}
                        iconColor={colors.primary}
                        onPress={() => handleUpdatePermission(share.id, share.permission, share.userId)}
                        theme={{
                          colors: {
                            primary: colors.primary,
                            surface: colors.surface,
                            onSurface: colors.text,
                          },
                        }}
                      />
                      <IconButton
                        {...props}
                        icon="delete"
                        size={20}
                        iconColor={colors.error}
                        onPress={() => handleRevoke(share.id, share.userId)}
                        theme={{
                          colors: {
                            primary: colors.error,
                            surface: colors.surface,
                            onSurface: colors.text,
                          },
                        }}
                      />
                    </View>
                  )}
                  style={styles.shareItem}
                  titleStyle={styles.shareItemTitle}
                  descriptionStyle={styles.shareItemDescription}
                  theme={{
                    colors: {
                      primary: colors.primary,
                      surface: colors.surface,
                      onSurface: colors.text,
                      onSurfaceVariant: colors.textSecondary,
                    },
                  }}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  permissionRow: {
    marginBottom: spacing.md,
  },
  permissionLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceDark,
    borderColor: colors.border,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
  shareButton: {
    marginTop: spacing.sm,
  },
  buttonLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  shareItem: {
    backgroundColor: colors.surface,
    borderRadius: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
  },
  shareActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareItemTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  shareItemDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
