import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, FontAwesome6, FontAwesome5, Feather } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { AppStackParamList, StoryTabParamList } from './types';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import CompletedStoryScreen from '../screens/stories/CompletedStoryScreen';
import OverviewScreen from '../screens/stories/OverviewScreen';
import CharactersScreen from '../screens/entities/CharactersScreen';
import BlurbsScreen from '../screens/entities/BlurbsScreen';
import ScenesScreen from '../screens/entities/ScenesScreen';
import ChaptersScreen from '../screens/entities/ChaptersScreen';
import GenerateStoryScreen from '../screens/generation/GenerateStoryScreen';
import { materialTopTabOptions } from './theme';
import { useTranslation } from '../hooks/useTranslation';
import { useGetStoryQuery, storiesApi } from '../store/api/storiesApi';
import { useAuth } from '../hooks/useAuth';
import { canEditStory } from '../utils/permissions';
import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { showSnackbar } from '../store/slices/uiSlice';
import { selectLastSyncTime } from '../store/slices/syncSlice';

const Tab = createMaterialTopTabNavigator<StoryTabParamList>();

/**
 * Story Navigator Component
 * Tab navigator for story detail screens (Overview, Characters, Blurbs, Scenes, Chapters, Generate)
 * 
 * Features:
 * - Tab navigator integration with Material Top Tabs
 * - Tab icons for each screen
 * - Tab labels for each screen
 * - Properly passes storyId to all tab screens
 * - Conditionally hides Generate tab when permission is 'read'
 */
const StoryNavigator = ({
  route
}: {
  route: RouteProp<AppStackParamList, 'StoryDetail'>;
}) => {
  const { t } = useTranslation();
  const { storyId } = route.params;
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState(false);
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const dispatch = useAppDispatch();
  const lastSyncTime = useAppSelector(selectLastSyncTime);
  const storyWasLoadedRef = useRef(false);
  const previousSyncTimeRef = useRef<number | null>(null);
  const hasNavigatedAway = useRef(false);

  // Fetch story to check permission for Generate tab visibility
  const { data: story, isError } = useGetStoryQuery(storyId);

  // Track if story was previously loaded
  useEffect(() => {
    if (story) {
      storyWasLoadedRef.current = true;
      hasNavigatedAway.current = false;
    }
  }, [story]);

  // Track sync completion and invalidate story query
  useEffect(() => {
    // Only invalidate if sync has completed (lastSyncTime changed)
    if (lastSyncTime && lastSyncTime !== previousSyncTimeRef.current) {
      previousSyncTimeRef.current = lastSyncTime;
      
      // Invalidate the specific story query to ensure fresh data after sync
      // RTK Query will automatically refetch, and the effect below will detect if story is removed
      dispatch(storiesApi.util.invalidateTags([{ type: 'Story', id: storyId }]));
    }
  }, [lastSyncTime, dispatch, storyId]);

  // Detect story removal after sync (when query state updates)
  useEffect(() => {
    // If story was previously loaded but now doesn't exist or has error, it was removed
    if (storyWasLoadedRef.current && (isError || !story) && !hasNavigatedAway.current) {
      hasNavigatedAway.current = true;

      // Navigate back to story list
      navigation.navigate('StoriesList');

      // Show notification
      dispatch(showSnackbar({
        message: t('stories:storyRemoved'),
        type: 'warning',
      }));
    }
  }, [story, isError, navigation, dispatch, t]);

  // Also detect immediate error (not just after sync)
  useEffect(() => {
    if (isError && storyWasLoadedRef.current && !hasNavigatedAway.current) {
      hasNavigatedAway.current = true;

      // Navigate back to story list
      navigation.navigate('StoriesList');

      // Show notification
      dispatch(showSnackbar({
        message: t('stories:storyRemoved'),
        type: 'warning',
      }));
    }
  }, [isError, navigation, dispatch, t]);

  // Check if user can edit (if not, they are read-only and Generate tab should be hidden)
  useEffect(() => {
    const checkCanEdit = async () => {
      if (!user || !story) {
        setCanEdit(false);
        return;
      }
      const canEditResult = await canEditStory(user.uid, story);
      setCanEdit(canEditResult);
    };
    checkCanEdit();
  }, [user, story]);

  // Hide Generate tab if user cannot edit (read-only)
  const showGenerateTab = canEdit;
    
  return (
    <Tab.Navigator
      screenOptions={materialTopTabOptions}
    >
      <Tab.Screen 
        name="CompletedStory" 
        component={CompletedStoryScreen}
        initialParams={{ storyId }}
        options={{
          tabBarLabel: t('stories:detail.tabs.completed'),
          tabBarIcon: ({ color }) => (
            <Feather 
              name="book-open" 
              size={20} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Overview" 
        component={OverviewScreen}
        initialParams={{ storyId }}
        options={{
          tabBarLabel: t('stories:detail.tabs.overview'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'document-text' : 'document-text-outline'} 
              size={20} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Characters" 
        component={CharactersScreen}
        initialParams={{ storyId }}
        options={{
          tabBarLabel: t('stories:detail.tabs.characters'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'people' : 'people-outline'} 
              size={20} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Blurbs" 
        component={BlurbsScreen}
        initialParams={{ storyId }}
        options={{
          tabBarLabel: t('stories:detail.tabs.blurbs'),
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 
              name="pen-fancy" 
              size={20} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Scenes" 
        component={ScenesScreen}
        initialParams={{ storyId }}
        options={{
          tabBarLabel: t('stories:detail.tabs.scenes'),
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 
              name="paragraph" 
              size={20} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Chapters" 
        component={ChaptersScreen}
        initialParams={{ storyId }}
        options={{
          tabBarLabel: t('stories:detail.tabs.chapters'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'reader' : 'reader-outline'} 
              size={20} 
              color={color} 
            />
          ),
        }}
      />
      {showGenerateTab && (
        <Tab.Screen 
          name="Generate" 
          component={GenerateStoryScreen}
          initialParams={{ storyId }}
          options={{
            tabBarLabel: t('stories:detail.tabs.generate'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? 'sparkles' : 'sparkles-outline'} 
                size={20} 
                color={color} 
              />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default StoryNavigator;