/**
 * CommentsSection
 * - Shared users can write comments (read/read-write)
 * - Owner can see + delete comments, but cannot comment
 * - Email and timestamp are on separate lines
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Divider, IconButton, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useGetStoryQuery } from '../../store/api/storiesApi';
import { useCreateCommentMutation, useDeleteCommentMutation, useGetCommentsQuery } from '../../store/api/commentsApi';
import { getStoryUserPermission } from '../../utils/permissions';
import type { StoryPermission } from '../../types';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

interface Props {
  storyId: string;
}

export const CommentsSection: React.FC<Props> = ({ storyId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: story } = useGetStoryQuery(storyId);
  const { data: comments = [], isLoading } = useGetCommentsQuery(storyId);

  const [permission, setPermission] = useState<StoryPermission>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createComment] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !story) {
        if (mounted) setPermission(null);
        return;
      }
      const p = await getStoryUserPermission(user.uid, story);
      if (mounted) setPermission(p);
    })().catch(() => {
      if (mounted) setPermission(null);
    });
    return () => {
      mounted = false;
    };
  }, [user, story]);

  const isOwner = permission === 'owner';
  const canComment = useMemo(
    () => permission === 'read' || permission === 'read-write',
    [permission]
  );

  const formatDate = (ts: number) => {
    try {
      return formatDistanceToNow(new Date(ts), { addSuffix: true });
    } catch {
      return new Date(ts).toLocaleString();
    }
  };

  const onSubmit = async () => {
    if (!user || !canComment) return;
    const content = commentText.trim();
    if (!content) return;

    setIsSubmitting(true);
    try {
      await createComment({
        storyId,
        userId: user.uid,
        data: {
          storyId,
          authorId: user.uid,
          authorEmail: user.email || '',
          content,
        },
      }).unwrap();
      setCommentText('');
    } catch (e: any) {
      Alert.alert(
        t('stories:comments.error'),
        e?.data?.error || t('stories:comments.createError')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = (commentId: string) => {
    if (!user || !isOwner) return;
    Alert.alert(
      t('stories:comments.deleteTitle'),
      t('stories:comments.deleteMessage'),
      [
        { text: t('common:buttons.cancel'), style: 'cancel' },
        {
          text: t('common:buttons.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment({ storyId, commentId, userId: user.uid }).unwrap();
            } catch (e: any) {
              Alert.alert(
                t('stories:comments.error'),
                e?.data?.error || t('stories:comments.deleteError')
              );
            }
          },
        },
      ]
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>{t('stories:comments.title')}</Text>
          {comments.length > 0 && <Text style={styles.count}>({comments.length})</Text>}
        </View>

        {canComment && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('stories:comments.placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              editable={!isSubmitting}
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!commentText.trim() || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!commentText.trim() || isSubmitting}
            >
              <Ionicons
                name="send"
                size={20}
                color={commentText.trim() && !isSubmitting ? colors.primary : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        )}

        {!canComment && (
          <Text style={styles.noPermissionText}>{t('stories:comments.noPermission')}</Text>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('stories:comments.loading')}</Text>
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('stories:comments.empty')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.commentsList} nestedScrollEnabled>
            {comments.map((comment, index) => (
              <View key={comment.id}>
                <View style={styles.commentItem}>
                  <View style={styles.commentAuthor}>
                    <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.authorEmail}>{comment.authorEmail}</Text>
                  </View>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                    {isOwner && (
                      <IconButton
                        icon="delete-outline"
                        size={18}
                        iconColor={colors.error}
                        onPress={() => onDelete(comment.id)}
                        style={styles.deleteButton}
                      />
                    )}
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
                {index < comments.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </ScrollView>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  count: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 60,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    padding: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
    textAlignVertical: 'top',
  },
  submitButton: {
    padding: spacing.md,
    borderRadius: spacing.xs,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  noPermissionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  commentsList: {
    maxHeight: 400,
  },
  commentItem: {
    paddingVertical: spacing.md,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  authorEmail: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  commentDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  deleteButton: {
    margin: 0,
  },
  commentContent: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.sm,
  },
});

