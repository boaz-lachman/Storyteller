/**
 * Edit Story Modal Component
 * Full-page modal wrapper for EditStoryForm
 */
import React from 'react';
import { View, StyleSheet, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import { EditStoryForm } from '../forms/EditStoryForm';
import type { EditStoryFormData } from '../../hooks/useEditStoryForm';
import type { Story } from '../../types';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export interface EditStoryModalProps {
  visible: boolean;
  story: Story | null;
  onClose: () => void;
  onSubmit: (data: EditStoryFormData) => void;
  isLoading?: boolean;
}

/**
 * Edit Story Modal Component
 * Full-page modal for editing an existing story
 */
export const EditStoryModal: React.FC<EditStoryModalProps> = ({
  visible,
  story,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const handleSubmit = (data: EditStoryFormData) => {
    onSubmit(data);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <Appbar.Header style={styles.header}>
          <Appbar.Action icon="close" onPress={onClose} />
          <Appbar.Content title="Edit Story" titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.content}>
          <EditStoryForm
            story={story}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={isLoading}
          />
        </View>
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

export default EditStoryModal;
