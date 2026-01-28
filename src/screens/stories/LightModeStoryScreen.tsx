/**
 * Light Mode Story Screen
 * Full-screen reading mode: generated story (BookView) only
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { useGetStoryQuery } from '../../store/api/storiesApi';
import { EmptyState } from '../../components/common/EmptyState';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { GradientBackground } from '../../components/common/GradientBackground';
import { BookView } from '../../components/reader/BookView';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppSelector } from '../../hooks/redux';
import { selectLanguage } from '../../store/slices/languageSlice';
import { SafeAreaView } from 'react-native-safe-area-context';

type LightModeStoryRouteProp = RouteProp<AppStackParamList, 'LightModeStory'>;
type LightModeStoryNavigationProp = NativeStackNavigationProp<AppStackParamList, 'LightModeStory'>;

interface LightModeStoryScreenProps {
  route: LightModeStoryRouteProp;
  navigation: LightModeStoryNavigationProp;
}

/**
 * Light Mode Story Screen Component
 * Distraction-free full-screen reading with BookView only
 */
export default function LightModeStoryScreen({ route, navigation }: LightModeStoryScreenProps) {
  const { t } = useTranslation();
  const { storyId } = route.params;
  const language = useAppSelector(selectLanguage);

  const { data: story, isLoading } = useGetStoryQuery(storyId);

  if (isLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <MainBookActivityIndicator size={80} />
          <Text style={styles.loadingText}>{t('stories:completed.loading')}</Text>
        </View>
      </GradientBackground>
    );
  }

  if (!story || !story.generatedContent) {
    return (
      <GradientBackground style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel={t('stories:lightMode.close')}
            >
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <EmptyState
            title={t('stories:completed.emptyTitle')}
            message={t('stories:completed.emptyMessage')}
            icon={<Feather name="book-open" size={64} color={colors.textSecondary} />}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Minimal header with close button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel={t('stories:lightMode.close')}
          >
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {story.title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Full-screen BookView */}
        <View style={styles.bookViewWrapper}>
          <BookView
            content={story.generatedContent}
            language={language}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  closeButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  bookViewWrapper: {
    flex: 1,
    minHeight: 200,
  },
});
