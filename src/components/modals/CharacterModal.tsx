/**
 * Character Modal Component
 * Full-page modal wrapper for CharacterForm
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { CharacterForm } from '../forms/CharacterForm';
import type { CharacterFormData } from '../../hooks/useCharacterForm';
import type { Character } from '../../types';
import { clearFormData } from '../../services/autosave/autosaveService';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';

export interface CharacterModalProps {
  visible: boolean;
  character?: Character | null;
  onClose: () => void;
  onSubmit: (data: CharacterFormData) => void;
  isLoading?: boolean;
  storyId?: string;
}

/**
 * Character Modal Component
 * Full-page modal for creating/editing a character
 */
export const CharacterModal: React.FC<CharacterModalProps> = ({
  visible,
  character,
  onClose,
  onSubmit,
  isLoading = false,
  storyId,
}) => {
  const { t } = useTranslation();
  const prevVisibleRef = useRef(visible);

  const handleSubmit = (data: CharacterFormData) => {
    onSubmit(data);
  };

  const handleClose = async () => {
    // Clear autosaved form content when modal closes
    await clearFormData('character', character?.id);
    onClose();
  };

  // Clear autosaved content when modal becomes invisible
  useEffect(() => {
    if (prevVisibleRef.current && !visible) {
      // Modal was visible and is now hidden - clear autosaved content
      clearFormData('character', character?.id).catch((error) => {
        console.error('Error clearing form data on modal close:', error);
      });
    }
    prevVisibleRef.current = visible;
  }, [visible, character?.id]);

  const modalTitle = character ? t('entities:characters.edit') : t('entities:characters.create');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View entering={SlideInDown.duration(300)}>
          <Appbar.Header style={styles.header}>
            <Appbar.Action icon="close" onPress={handleClose} />
            <Appbar.Content title={modalTitle} titleStyle={styles.headerTitle} />
          </Appbar.Header>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.content}>
          <CharacterForm
            character={character}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
            storyId={storyId}
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
});

export default CharacterModal;
