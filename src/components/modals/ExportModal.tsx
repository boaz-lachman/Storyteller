/**
 * Export Modal Component
 * UI for exporting stories with format and type options
 */
import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, Button, Card, RadioButton, Portal, Dialog } from 'react-native-paper';
import { Entypo, Feather } from '@expo/vector-icons';
import { exportAndShareStory, getExportTypeOptions, getFormatOptions, type ExportOptions, type ExportFormat, type ExportType } from '../../services/pdf/exportService';
import MainBookActivityIndicator from '../common/MainBookActivityIndicator';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';

export interface ExportModalProps {
  visible: boolean;
  onDismiss: () => void;
  story: Story;
  entities: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  };
}

/**
 * Export Modal Component
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onDismiss,
  story,
  entities,
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportType, setExportType] = useState<ExportType>('full');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const formatOptions = getFormatOptions();
  const typeOptions = getExportTypeOptions();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress('Preparing export...');

      const options: ExportOptions = {
        format: exportFormat,
        type: exportType,
        includeCharacters: exportType === 'full' || exportType === 'elements-only',
      };

      setExportProgress('Generating PDF...');
      await exportAndShareStory(story, entities, options);

      setExportProgress('');
      setIsExporting(false);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Export error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export story');
      setIsExporting(false);
      setExportProgress('');
      setShowErrorDialog(true);
    }
  };

  const handleDismissSuccess = () => {
    setShowSuccessDialog(false);
    onDismiss();
  };

  const handleDismissError = () => {
    setShowErrorDialog(false);
  };

  return (
    <>
      <Modal
        visible={visible && !isExporting && !showSuccessDialog && !showErrorDialog}
        onDismiss={onDismiss}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Card.Content>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Export Story</Text>
                <Button
                  mode="text"
                  onPress={onDismiss}
                  icon={() => <Feather name="x" size={20} color={colors.primary} />}
                >
                  Close
                </Button>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Export Type Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Export Type</Text>
                  <RadioButton.Group
                    onValueChange={(value) => setExportType(value as ExportType)}
                    value={exportType}
                  >
                    {typeOptions.map((option) => (
                      <View key={option.value} style={styles.radioOption}>
                        <RadioButton value={option.value} color={colors.primary} />
                        <View style={styles.radioContent}>
                          <Text style={styles.radioLabel}>{option.label}</Text>
                          <Text style={styles.radioDescription}>{option.description}</Text>
                        </View>
                      </View>
                    ))}
                  </RadioButton.Group>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={styles.cancelButton}
                  disabled={isExporting}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleExport}
                  style={styles.exportButton}
                  disabled={isExporting}
                  icon={() => <Entypo name="export" size={20} color={colors.textInverse} />}
                >
                  Export
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>

      {/* Export Progress Modal */}
      <Modal
        visible={isExporting}
        transparent
        animationType="fade"
      >
        <View style={styles.progressOverlay}>
          <Card style={styles.progressCard}>
            <Card.Content>
              <MainBookActivityIndicator size={80} style={styles.progressIndicator} />
              <Text style={styles.progressText}>{exportProgress || 'Exporting...'}</Text>
              <Text style={styles.progressSubtext}>Please wait while we prepare your export</Text>
            </Card.Content>
          </Card>
        </View>
      </Modal>

      {/* Success Dialog */}
      <Portal>
        <Dialog visible={showSuccessDialog} onDismiss={handleDismissSuccess}>
          <Dialog.Icon icon="check-circle" size={48} color={colors.success} />
          <Dialog.Title>Export Successful</Dialog.Title>
          <Dialog.Content>
            <Text>Your story has been exported successfully!</Text>
            <Text style={styles.dialogSubtext}>
              The file is ready to share. Use the share sheet to save or share it.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismissSuccess}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog visible={showErrorDialog} onDismiss={handleDismissError}>
          <Dialog.Icon icon="alert-circle" size={48} color={colors.error} />
          <Dialog.Title>Export Failed</Dialog.Title>
          <Dialog.Content>
            <Text>{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismissError}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  content: {
    maxHeight: 400,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  radioContent: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  radioLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
  },
  radioDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  exportButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  progressCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.surface,
  },
  progressIndicator: {
    marginBottom: spacing.md,
  },
  progressText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  progressSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dialogSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

export default ExportModal;
