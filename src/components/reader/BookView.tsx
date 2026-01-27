/**
 * BookView Component
 * A paginated book reader with search and navigation
 * Supports RTL for Hebrew and LTR for English
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
  LayoutChangeEvent,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Text, IconButton, Portal, Modal } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';

// Calculate characters per page based on screen dimensions
const getCharsPerPage = () => {
  const screenHeight = Dimensions.get('window').height;
  const lineHeight = 28; // Must match styles.pageText.lineHeight
  const fontSize = 16; // Must match typography.fontSize.md

  // Account for all vertical space conservatively to ensure text fits
  // padding top (24) + footer padding (16+8) + footer text (~20) + controls (~60) + extra safety buffer (40)
  const verticalPadding = 24 + 16 + 8 + 20 + 60 + 40;
  const availableHeight = screenHeight - verticalPadding;

  // Calculate lines that fit (reduce by 3 lines for safety to prevent cutoff)
  const linesPerPage = Math.max(Math.floor(availableHeight / lineHeight) - 3, 4);

  // Estimate characters per line (rough approximation)
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 48; // 24 * 2 for left/right
  const availableWidth = screenWidth - horizontalPadding;
  const avgCharWidth = fontSize * 0.5; // Rough estimate
  const charsPerLine = Math.floor(availableWidth / avgCharWidth);

  // Reduce by 30% to ensure all text fits on page (split into more pages)
  const calculatedChars = linesPerPage * charsPerLine;
  const conservativeChars = Math.floor(calculatedChars * 0.7);

  return Math.max(conservativeChars, 300); // Minimum 300 chars (reduced from 500)
};

interface BookViewProps {
  content: string;
  language?: 'en' | 'he';
  onPageChange?: (page: number) => void;
  initialPage?: number;
}

interface Page {
  index: number;
  content: string;
  startPosition: number;
  endPosition: number;
}

/**
 * BookView Component
 */
export const BookView: React.FC<BookViewProps> = ({
  content,
  language = 'en',
  onPageChange,
  initialPage = 0,
}) => {
  const { t } = useTranslation();
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [navigationVisible, setNavigationVisible] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');

  // Determine text direction
  const isRTL = language === 'he';
  const textDirection = isRTL ? 'rtl' : 'ltr';

  // Split content into pages based on screen size
  const pages = useMemo(() => {
    if (!content || content.trim().length === 0) {
      return [{ index: 0, content: '', startPosition: 0, endPosition: 0 }];
    }

    const charsPerPage = getCharsPerPage();
    const pageList: Page[] = [];
    const paragraphs = content.split(/\n\n+/);
    let currentPageContent = '';
    let currentPageStart = 0;
    let pageIndex = 0;
    let charPosition = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphWithSpacing = i < paragraphs.length - 1 ? paragraph + '\n\n' : paragraph;

      // Check if adding this paragraph exceeds page limit
      if (currentPageContent.length + paragraphWithSpacing.length > charsPerPage && currentPageContent.length > 0) {
        // Save current page
        pageList.push({
          index: pageIndex,
          content: currentPageContent.trim(),
          startPosition: currentPageStart,
          endPosition: charPosition,
        });
        pageIndex++;
        currentPageStart = charPosition;
        currentPageContent = paragraphWithSpacing;
      } else {
        currentPageContent += paragraphWithSpacing;
      }

      charPosition += paragraphWithSpacing.length;
    }

    // Add the last page if there's content
    if (currentPageContent.trim().length > 0) {
      pageList.push({
        index: pageIndex,
        content: currentPageContent.trim(),
        startPosition: currentPageStart,
        endPosition: charPosition,
      });
    }

    return pageList.length > 0 ? pageList : [{ index: 0, content: '', startPosition: 0, endPosition: 0 }];
  }, [content]);

  // Navigate to specific page
  const goToPage = useCallback((pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return;

    pagerRef.current?.setPage(pageIndex);
    setCurrentPage(pageIndex);
    onPageChange?.(pageIndex);
  }, [pages.length, onPageChange]);

  // Handle page input navigation
  const handlePageNavigation = useCallback(() => {
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages.length) {
      goToPage(pageNum - 1); // Convert to 0-based index
      setNavigationVisible(false);
      setPageInputValue('');
    }
  }, [pageInputValue, pages.length, goToPage]);

  // Handle page selection change
  const handlePageSelected = useCallback((e: any) => {
    const position = e.nativeEvent.position;
    setCurrentPage(position);
    onPageChange?.(position);
  }, [onPageChange]);

  // Render page item
  const renderPage = useCallback((page: Page) => {
    return (
      <View key={`page-${page.index}`} style={[styles.pageContainer, { direction: textDirection }]}>
        <View style={styles.pageContent}>
          <Text
            style={[
              styles.pageText,
              isRTL && styles.pageTextRTL,
            ]}
            selectable
          >
            {page.content}
          </Text>
        </View>
        <View style={styles.pageFooter}>
          <Text style={styles.pageNumber}>
            {page.index + 1} / {pages.length}
          </Text>
        </View>
      </View>
    );
  }, [pages.length, textDirection, isRTL]);

  // Render page navigation modal
  const renderNavigationModal = () => (
    <Portal>
      <Modal
        visible={navigationVisible}
        onDismiss={() => setNavigationVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.navigationModalContent}>
          <View style={styles.navigationModalHeader}>
            <Text style={styles.navigationModalTitle}>{t('stories:bookView.goToPage')}</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setNavigationVisible(false)}
            />
          </View>

          <TextInput
            style={styles.pageInput}
            placeholder={t('stories:bookView.pageNumberPlaceholder', { total: pages.length })}
            keyboardType="number-pad"
            value={pageInputValue}
            onChangeText={setPageInputValue}
            onSubmitEditing={handlePageNavigation}
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={styles.goButton}
            onPress={handlePageNavigation}
            activeOpacity={0.7}
          >
            <Text style={styles.goButtonText}>{t('stories:bookView.go')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Portal>
  );

  return (
    <View style={styles.container}>
      {/* Book pages */}
      <View style={styles.bookContainer}>
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={initialPage}
          onPageSelected={handlePageSelected}
          orientation="horizontal"
          overdrag={true}
          layoutDirection={isRTL ? 'rtl' : 'ltr'}
        >
          {pages.map(renderPage)}
        </PagerView>
      </View>

      {/* Control buttons - Below the content */}
      <View style={[styles.controls, isRTL && styles.controlsRTL]}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setNavigationVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={currentPage === 0 ? colors.textTertiary : colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentPage === pages.length - 1 && styles.navButtonDisabled]}
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage === pages.length - 1}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={24}
              color={currentPage === pages.length - 1 ? colors.textTertiary : colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Page Navigation Modal */}
      {renderNavigationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bookContainer: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
  },
  pageContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  pageText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
    lineHeight: 28,
    textAlign: 'left',
  },
  pageTextRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pageFooter: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  pageNumber: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  controlsRTL: {
    flexDirection: 'row-reverse',
  },
  controlButton: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.md,
    elevation: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.md,
    elevation: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    margin: spacing.xl,
    borderRadius: spacing.md,
    padding: spacing.lg,
  },
  navigationModalContent: {
    minHeight: 150,
  },
  navigationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  navigationModalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  pageInput: {
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    padding: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  goButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.xs,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  goButtonText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.background,
  },
});
