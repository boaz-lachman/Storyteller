/**
 * Story Detail Screen
 * Container component that fetches story data and sets up tab navigation
 * Displays story title in header and renders StoryNavigator with tabs
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { useGetStoryQuery } from '../../store/api/storiesApi';
import StoryNavigator from '../../navigation/StoryNavigator';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { GradientBackground } from '../../components/common/GradientBackground';
import { ShareStoryModal } from '../../components/modals/ShareStoryModal';
import { useAuth } from '../../hooks/useAuth';
import { canShareStory } from '../../utils/permissions';
import { TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { useState, useCallback } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';

type StoryDetailRouteProp = RouteProp<AppStackParamList, 'StoryDetail'>;
type StoryDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'StoryDetail'>;

/**
 * Story Detail Screen Component
 * - Gets story ID from route params
 * - Fetches story data using RTK Query
 * - Sets up header with story title
 * - Renders StoryNavigator with tab navigation
 */
export default function StoryDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute<StoryDetailRouteProp>();
  const navigation = useNavigation<StoryDetailNavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { storyId } = route.params;
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Fetch story data
  const {
    data: story,
    isLoading,
    isError,
    error,
  } = useGetStoryQuery(storyId);

  // Handle share story
  const handleSharePress = useCallback(async () => {
    if (!user || !story) return;
    const canShare = await canShareStory(user.uid, story);
    if (!canShare) {
      dispatch(
        showSnackbar({
          message: t('stories:permissions.noShare'),
          type: 'error',
        })
      );
      return;
    }
    setShareModalVisible(true);
  }, [user, story, dispatch, t]);

  // Set header title and configure navigation when story data is loaded
  useEffect(() => {
    if (story?.title) {
      navigation.setOptions({
        title: story.title,
        headerTitle: story.title.toUpperCase(),
        headerBackVisible: false, // Hide back button
        headerRight: () => (
          <TouchableOpacity
            onPress={handleSharePress}
            style={{ marginRight: spacing.md, padding: spacing.xs }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AntDesign name="share-alt" size={24} color={colors.text} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerBackVisible: false,
      });
    }
  }, [story?.title, story, navigation, handleSharePress]);

  // Show loading state
  if (isLoading) {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <MainBookActivityIndicator size={80} />
          <Text style={styles.loadingText}>{t('stories:detail.loading')}</Text>
        </View>
      </GradientBackground>
    );
  }

  // Show error state
  if (isError || !story) {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <Text style={styles.errorTitle}>{t('stories:detail.errorTitle')}</Text>
          <Text style={styles.errorText}>
            {error && 'error' in error ? error.error : t('stories:detail.errorMessage')}
          </Text>
        </View>
      </GradientBackground>
    );
  }

  // Render StoryNavigator with tabs
  return (
    <>
      <StoryNavigator route={route} />
      <ShareStoryModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        story={story || null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  errorTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
