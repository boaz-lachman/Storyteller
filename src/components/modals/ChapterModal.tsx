/**
 * Chapter Modal Component
 * Modal wrapper for ChapterForm
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { ChapterForm } from '../forms/ChapterForm';
import type { Chapter } from '../../types';
import { clearFormData } from '../../services/autosave/autosaveService';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import type { ChapterFormData } from '../../hooks/useChapterForm';
import { useTranslation } from '../../hooks/useTranslation';

export interface ChapterModalProps {
  visible: boolean;
  chapter?: Chapter | null;
  storyId: string;
  onClose: () => void;
  onSubmit: (data: ChapterFormData) => void;
  isLoading?: boolean;
}

/**
 * Chapter Modal Component
 */
export const ChapterModal: React.FC<ChapterModalProps> = ({
  visible,
  chapter,
  storyId,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const prevVisibleRef = useRef(visible);

  const handleClose = async () => {
    // Clear autosaved form content when modal closes
    await clearFormData('chapter', chapter?.id);
    onClose();
  };

  // Clear autosaved content when modal becomes invisible
  useEffect(() => {
    if (prevVisibleRef.current && !visible) {
      // Modal was visible and is now hidden - clear autosaved content
      clearFormData('chapter', chapter?.id).catch((error) => {
        console.error('Error clearing form data on modal close:', error);
      });
    }
    prevVisibleRef.current = visible;
  }, [visible, chapter?.id]);

  const modalTitle = chapter ? t('entities:chapters.edit') : t('entities:chapters.create');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View entering={SlideInDown.duration(300)} style={styles.header}>
          <Appbar.Action icon="close" onPress={handleClose} />
          <Appbar.Content title={modalTitle} titleStyle={styles.headerTitle} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.content}>
          <ChapterForm
            chapter={chapter}
            storyId={storyId}
            onSubmit={onSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
          />
        </Animated.View>
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
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
});

export default ChapterModal;
