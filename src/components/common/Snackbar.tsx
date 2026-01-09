/**
 * Global Snackbar component using react-native-paper
 * Connected to Redux uiSlice for state management
 * Covers the entire app using absolute positioning
 * Complies with SafeAreaView for proper insets on all devices
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Snackbar as PaperSnackbar } from 'react-native-paper';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { selectSnackbar, hideSnackbar, executeUndo, showSnackbar } from '../../store/slices/uiSlice';
import { selectDeletedCharacter, clearDeletedCharacter } from '../../store/slices/charactersSlice';
import { selectDeletedBlurb, clearDeletedBlurb } from '../../store/slices/blurbsSlice';
import { selectDeletedScene, clearDeletedScene } from '../../store/slices/scenesSlice';
import { useCreateCharacterMutation } from '../../store/api/charactersApi';
import { useCreateBlurbMutation } from '../../store/api/blurbsApi';
import { useCreateSceneMutation } from '../../store/api/scenesApi';
import { useCreateStoryMutation } from '../../store/api/storiesApi';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

/**
 * Maps snackbar type to react-native-paper Snackbar style
 * Uses theme colors from constants
 */
const getSnackbarStyle = (type: 'success' | 'error' | 'info' | 'warning' | null) => {
  switch (type) {
    case 'success':
      return {
        backgroundColor: colors.success,
      };
    case 'error':
      return {
        backgroundColor: colors.error,
      };
    case 'warning':
      return {
        backgroundColor: colors.warning,
      };
    case 'info':
      return {
        backgroundColor: colors.info,
      };
    default:
      return {
        backgroundColor: colors.primary,
      };
  }
};

/**
 * Global Snackbar component
 * Automatically displays messages from Redux state and hides on dismiss
 * Supports undo action when provided
 * Respects safe area insets for proper positioning on all devices
 */
export const Snackbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector(selectSnackbar);
  const deletedCharacter = useAppSelector(selectDeletedCharacter);
  const deletedBlurb = useAppSelector(selectDeletedBlurb);
  const deletedScene = useAppSelector(selectDeletedScene);
  const { user } = useAuth();
  const [createCharacter] = useCreateCharacterMutation();
  const [createBlurb] = useCreateBlurbMutation();
  const [createScene] = useCreateSceneMutation();
  const [createStory] = useCreateStoryMutation();
  const insets = useSafeAreaInsets();

  const visible = !!snackbar.message;
  const message = snackbar.message || '';
  const type = snackbar.type;
  const undoAction = snackbar.undoAction;

  const handleDismiss = () => {
    if (deletedCharacter && undoAction?.type === 'undo-character-delete') {
      dispatch(clearDeletedCharacter());
    }
    if (deletedBlurb && undoAction?.type === 'undo-blurb-delete') {
      dispatch(clearDeletedBlurb());
    }
    if (deletedScene && undoAction?.type === 'undo-scene-delete') {
      dispatch(clearDeletedScene());
    }
    dispatch(hideSnackbar());
  };

  const handleUndo = async () => {
    if (undoAction && undoAction.type === 'undo-character-delete' && deletedCharacter && user) {
      try {
        await createCharacter({
          userId: user.uid,
          storyId: deletedCharacter.storyId,
          data: {
            name: deletedCharacter.name,
            description: deletedCharacter.description,
            importance: deletedCharacter.importance,
            role: deletedCharacter.role,
            traits: deletedCharacter.traits,
            backstory: deletedCharacter.backstory,
          },
        }).unwrap();
        dispatch(clearDeletedCharacter());
        dispatch(executeUndo());
        dispatch(hideSnackbar());
        dispatch(
          showSnackbar({
            message: 'Character restored',
            type: 'success',
          })
        );
      } catch (err: any) {
        console.error('Error restoring character:', err);
        dispatch(clearDeletedCharacter());
        dispatch(executeUndo());
        dispatch(hideSnackbar());
        dispatch(
          showSnackbar({
            message: 'Failed to restore character',
            type: 'error',
          })
        );
      }
    } else if (undoAction && undoAction.type === 'undo-blurb-delete' && deletedBlurb && user) {
      try {
        await createBlurb({
          userId: user.uid,
          storyId: deletedBlurb.storyId,
          data: {
            title: deletedBlurb.title,
            description: deletedBlurb.description,
            importance: deletedBlurb.importance,
            category: deletedBlurb.category,
          },
        }).unwrap();
        dispatch(clearDeletedBlurb());
        dispatch(executeUndo());
        dispatch(hideSnackbar());
        dispatch(
          showSnackbar({
            message: 'Blurb restored',
            type: 'success',
          })
        );
      } catch (err: any) {
        console.error('Error restoring blurb:', err);
        dispatch(clearDeletedBlurb());
        dispatch(executeUndo());
        dispatch(hideSnackbar());
        dispatch(
          showSnackbar({
            message: 'Failed to restore blurb',
            type: 'error',
          })
        );
      }
    } else if (undoAction && undoAction.type === 'undo-scene-delete' && deletedScene && user) {
      try {
        await createScene({
          userId: user.uid,
          storyId: deletedScene.storyId,
          data: {
            title: deletedScene.title,
            description: deletedScene.description,
            setting: deletedScene.setting,
            characters: deletedScene.characters,
            importance: deletedScene.importance,
            mood: deletedScene.mood,
            conflictLevel: deletedScene.conflictLevel,
          },
        }).unwrap();
        dispatch(clearDeletedScene());
        dispatch(executeUndo());
        dispatch(hideSnackbar());
        dispatch(
          showSnackbar({
            message: 'Scene restored',
            type: 'success',
          })
        );
      } catch (err: any) {
        console.error('Error restoring scene:', err);
        dispatch(clearDeletedScene());
        dispatch(executeUndo());
        dispatch(hideSnackbar());
        dispatch(
          showSnackbar({
            message: 'Failed to restore scene',
            type: 'error',
          })
        );
      }
    } else if (undoAction && undoAction.type === 'undo-story-delete' && undoAction.data && user) {
      // Handle story undo
      const storyData = undoAction.data as any;
      if (storyData.story) {
        try {
          await createStory({
            userId: user.uid,
            data: {
              title: storyData.story.title,
              description: storyData.story.description,
              length: storyData.story.length,
              theme: storyData.story.theme,
              tone: storyData.story.tone,
              pov: storyData.story.pov,
              targetAudience: storyData.story.targetAudience,
              setting: storyData.story.setting,
              timePeriod: storyData.story.timePeriod,
              status: storyData.story.status,
              generatedContent: storyData.story.generatedContent,
              generatedAt: storyData.story.generatedAt,
              wordCount: storyData.story.wordCount,
            },
          }).unwrap();
          dispatch(executeUndo());
          dispatch(hideSnackbar());
          dispatch(
            showSnackbar({
              message: 'Story restored',
              type: 'success',
            })
          );
        } catch (err: any) {
          console.error('Error restoring story:', err);
          dispatch(executeUndo());
          dispatch(hideSnackbar());
          dispatch(
            showSnackbar({
              message: 'Failed to restore story',
              type: 'error',
            })
          );
        }
      } else {
        dispatch(executeUndo());
        dispatch(hideSnackbar());
      }
    } else {
      dispatch(executeUndo());
      dispatch(hideSnackbar());
    }
  };

  if (!visible) {
    return null;
  }

  // Determine action button: show "Undo" if undoAction is provided, otherwise "Dismiss"
  const action = undoAction
    ? {
        label: 'Undo',
        onPress: handleUndo,
      }
    : {
        label: 'Dismiss',
        onPress: handleDismiss,
      };

  // Calculate bottom padding: use safe area inset or minimum spacing
  const bottomPadding = Math.max(insets.bottom, spacing.sm);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <PaperSnackbar
        visible={visible}
        onDismiss={handleDismiss}
        duration={undoAction ? 5000 : 3000} // Longer duration when undo is available
        style={[
          getSnackbarStyle(type), 
          styles.snackbar,
          { bottom: bottomPadding }
        ]}
        action={action}
      >
        {message}
      </PaperSnackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
  },
  snackbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '95%',
  },
});

export default Snackbar;
