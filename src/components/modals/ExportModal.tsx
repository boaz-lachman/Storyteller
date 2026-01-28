/**
 * Export Modal Component
 * UI for exporting stories with format and type options
 */
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, Button, Card, RadioButton, Portal, Dialog } from 'react-native-paper';
import { Entypo, Feather } from '@expo/vector-icons';
import { exportAndShareStory, getExportTypeOptions, getFormatOptions, type ExportOptions, type ExportFormat, type ExportType } from '../../services/pdf/exportService';
import MainBookActivityIndicator from '../common/MainBookActivityIndicator';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Story, Character, IdeaBlurb, Scene, Chapter } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

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
  const { t } = useTranslation();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportType, setExportType] = useState<ExportType>('full');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const formatOptions = getFormatOptions();
  const typeOptions = getExportTypeOptions();
  
  // Map export type options to translations (memoized)
  const translatedTypeOptions = useMemo(() => {
    return typeOptions.map((option) => {
      let label = option.label;
      let description = option.description;
      
      switch (option.value) {
        case 'full':
          label = t('stories:export.types.full.label');
          description = t('stories:export.types.full.description');
          break;
        case 'elements-only':
          label = t('stories:export.types.elementsOnly.label');
          description = t('stories:export.types.elementsOnly.description');
          break;
        case 'generated-only':
          label = t('stories:export.types.generatedOnly.label');
          description = t('stories:export.types.generatedOnly.description');
          break;
      }
      
      return {
        ...option,
        label,
        description,
      };
    });
  }, [typeOptions, t]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress(t('stories:export.progress.preparing'));

      const options: ExportOptions = {
        format: exportFormat,
        type: exportType,
        includeCharacters: exportType === 'full' || exportType === 'elements-only',
      };

      setExportProgress(t('stories:export.progress.generating'));
      await exportAndShareStory(story, entities, options);

      setExportProgress('');
      setIsExporting(false);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Export error:', error);
      setErrorMessage(error instanceof Error ? error.message : t('stories:export.error.defaultMessage'));
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
                <Text style={styles.title}>{t('stories:export.title')}</Text>
                <Button
                  mode="text"
                  onPress={onDismiss}
                  icon={() => <Feather name="x" size={20} color={colors.primary} />}
                >
                </Button>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Format Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('stories:export.format') || 'Format'}</Text>
                  <RadioButton.Group
                    onValueChange={(value) => setExportFormat(value as ExportFormat)}
                    value={exportFormat}
                  >
                    {formatOptions.map((option) => (
                      <View key={option.value} style={styles.radioOption}>
                        <RadioButton value={option.value} color={colors.primary} />
                        <View style={styles.radioContent}>
                          <Text style={styles.radioLabel}>{option.label}</Text>
                        </View>
                      </View>
                    ))}
                  </RadioButton.Group>
                </View>

                {/* Export Type Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('stories:export.exportType')}</Text>
                  <RadioButton.Group
                    onValueChange={(value) => setExportType(value as ExportType)}
                    value={exportType}
                  >
                    {translatedTypeOptions.map((option) => (
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
                  {t('stories:export.buttons.cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleExport}
                  style={styles.exportButton}
                  disabled={isExporting}
                  icon={() => <Entypo name="export" size={20} color={colors.textInverse} />}
                >
                  {t('stories:export.buttons.export')}
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
              <Text style={styles.progressText}>{exportProgress || t('stories:export.progress.exporting')}</Text>
              <Text style={styles.progressSubtext}>{t('stories:export.progress.subtext')}</Text>
            </Card.Content>
          </Card>
        </View>
      </Modal>

      {/* Success Dialog */}
      <Portal>
        <Dialog visible={showSuccessDialog} onDismiss={handleDismissSuccess}>
          <Dialog.Icon icon="check-circle" size={48} color={colors.success} />
          <Dialog.Title>{t('stories:export.success.title')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('stories:export.success.message')}</Text>
            <Text style={styles.dialogSubtext}>
              {t('stories:export.success.subtext')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismissSuccess}>{t('stories:export.success.ok')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog visible={showErrorDialog} onDismiss={handleDismissError}>
          <Dialog.Icon icon="alert-circle" size={48} color={colors.error} />
          <Dialog.Title>{t('stories:export.error.title')}</Dialog.Title>
          <Dialog.Content>
            <Text>{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismissError}>{t('stories:export.error.ok')}</Button>
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
    maxHeight: 300,
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
