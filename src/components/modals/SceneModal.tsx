/**
 * Scene Modal Component
 * Modal wrapper for SceneForm
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { SceneForm } from '../forms/SceneForm';
import type { Scene } from '../../types';
import { clearFormData } from '../../services/autosave/autosaveService';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import type { SceneFormData } from '../../hooks/useSceneForm';
import { useTranslation } from '../../hooks/useTranslation';

export interface SceneModalProps {
  visible: boolean;
  scene?: Scene | null;
  storyId: string;
  onClose: () => void;
  onSubmit: (data: SceneFormData) => void;
  isLoading?: boolean;
}

/**
 * Scene Modal Component
 */
export const SceneModal: React.FC<SceneModalProps> = ({
  visible,
  scene,
  storyId,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const prevVisibleRef = useRef(visible);

  const handleClose = async () => {
    // Clear autosaved form content when modal closes
    await clearFormData('scene', scene?.id);
    onClose();
  };

  // Clear autosaved content when modal becomes invisible
  useEffect(() => {
    if (prevVisibleRef.current && !visible) {
      // Modal was visible and is now hidden - clear autosaved content
      clearFormData('scene', scene?.id).catch((error) => {
        console.error('Error clearing form data on modal close:', error);
      });
    }
    prevVisibleRef.current = visible;
  }, [visible, scene?.id]);

  const modalTitle = scene ? t('entities:scenes.edit') : t('entities:scenes.create');

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
          <SceneForm
            scene={scene}
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

export default SceneModal;
