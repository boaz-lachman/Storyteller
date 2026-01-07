import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, FontAwesome6, FontAwesome5 } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { AppStackParamList, StoryTabParamList } from './types';
import OverviewScreen from '../screens/stories/OverviewScreen';
import CharactersScreen from '../screens/entities/CharactersScreen';
import BlurbsScreen from '../screens/entities/BlurbsScreen';
import ScenesScreen from '../screens/entities/ScenesScreen';
import ChaptersScreen from '../screens/entities/ChaptersScreen';
import GenerateStoryScreen from '../screens/generation/GenerateStoryScreen';
import { materialTopTabOptions } from './theme';

const Tab = createMaterialTopTabNavigator<StoryTabParamList>();

/**
 * Story Navigator Component
 * Tab navigator for story detail screens (Overview, Characters, Blurbs, Scenes, Chapters, Generate)
 */
const StoryNavigator = ({ 
  route 
}: { 
  route: RouteProp<AppStackParamList, 'StoryDetail'> 
}) => {
  const { storyId } = route.params;
    
    return (
      <Tab.Navigator
        screenOptions={materialTopTabOptions}
      >
        <Tab.Screen 
          name="Overview" 
          component={OverviewScreen}
          initialParams={{ storyId }}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Characters" 
          component={CharactersScreen}
          initialParams={{ storyId }}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Blurbs" 
          component={BlurbsScreen}
          initialParams={{ storyId }}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <FontAwesome5 name={focused ? 'pen-fancy' : 'pen-fancy'} size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Scenes" 
          component={ScenesScreen}
          initialParams={{ storyId }}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <FontAwesome6 name={focused ? 'paragraph' : 'paragraph'} size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Chapters" 
          component={ChaptersScreen}
          initialParams={{ storyId }}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'reader' : 'reader-outline'} size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Generate" 
          component={GenerateStoryScreen}
          initialParams={{ storyId }}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={20} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  export default StoryNavigator;