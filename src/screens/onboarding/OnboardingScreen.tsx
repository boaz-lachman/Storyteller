/**
 * Onboarding Screen
 * Carousel-based onboarding flow with 5 cards
 * Task 15.3: Create OnboardingScreen with carousel layout
 * Task 15.7: Add animations (smooth card transitions, fade effects, button animations)
 * Task 15.8: Polish design (theme consistency, text clarity, responsive layout)
 */
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useAppDispatch } from '../../hooks/redux';
import { completeOnboarding, skipOnboarding } from '../../store/slices/onboardingSlice';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { onboardingCards } from './onboardingData';
import { PaperButton } from '../../components/forms/PaperButton';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

/**
 * Onboarding Screen Component
 * Displays onboarding cards in a swipeable carousel
 */
export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const isRTL = I18nManager.isRTL;
  const totalPages = onboardingCards.length;
  const isLastPage = currentPage === totalPages - 1;

  // Handle page change
  const handlePageSelected = (e: any) => {
    setCurrentPage(e.nativeEvent.position);
  };

  // Navigate to next page
  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      const nextPage = currentPage + 1;
      pagerRef.current?.setPage(nextPage);
      setCurrentPage(nextPage);
    }
  };

  // Navigate to previous page
  const handlePrevious = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      pagerRef.current?.setPage(prevPage);
      setCurrentPage(prevPage);
    }
  };

  // Complete onboarding (reached last page)
  const handleComplete = () => {
    dispatch(completeOnboarding());
  };

  // Skip onboarding
  const handleSkip = () => {
    dispatch(skipOnboarding());
  };

  // Navigate to specific page (for dots)
  const handleDotPress = (index: number) => {
    pagerRef.current?.setPage(index);
    setCurrentPage(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Skip button */}
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Carousel/PagerView */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        {onboardingCards.map((card, index) => (
          <View key={index} style={styles.page}>
            <OnboardingCard data={card} />
          </View>
        ))}
      </PagerView>

      {/* Progress Indicator (Dots) */}
      <Animated.View
        entering={FadeIn.duration(400).delay(200)}
        style={styles.progressContainer}
      >
        {onboardingCards.map((_, index) => {
          const isActive = index === currentPage;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              style={[
                styles.dot,
                isActive && styles.dotActive,
                index < onboardingCards.length - 1 && styles.dotMargin,
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Navigation Buttons */}
      <Animated.View
        entering={FadeIn.duration(400).delay(300)}
        style={styles.buttonContainer}
      >
        {currentPage > 0 ? (
          <>
            <PaperButton
              variant="text"
              onPress={handlePrevious}
              style={styles.navButton}
            >
              Previous
            </PaperButton>
            <View style={styles.buttonSpacer} />
          </>
        ) : (
          <View style={styles.spacer} />
        )}
        {isLastPage ? (
          <PaperButton
            variant="text"
            onPress={handleComplete}
            style={styles.completeButton}
          >
            Get Started
          </PaperButton>
        ) : (
          <PaperButton
            variant="text"
            onPress={handleNext}
            style={styles.navButton}
          >
            Next
          </PaperButton>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.xs,
  },
  skipButtonText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  dotMargin: {
    marginRight: spacing.sm,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  navButton: {
    flex: 1,
  },
  completeButton: {
    flex: 1,
  },
  buttonSpacer: {
    width: spacing.md,
  },
  spacer: {
    flex: 1,
  },
});
