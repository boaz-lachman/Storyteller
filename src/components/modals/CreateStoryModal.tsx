/**
 * Create Story Modal Component
 * Full-page modal wrapper for CreateStoryForm
 */
import React from 'react';
import { View, StyleSheet, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import { CreateStoryForm } from '../forms/CreateStoryForm';
import type { CreateStoryFormData } from '../../hooks/useCreateStoryForm';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export interface CreateStoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStoryFormData) => void;
  isLoading?: boolean;
}

/**
 * Create Story Modal Component
 * Full-page modal for creating a new story
 */
export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const handleSubmit = (data: CreateStoryFormData) => {
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
          <Appbar.Content title="Create New Story" titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.content}>
          <CreateStoryForm
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

export default CreateStoryModal;
