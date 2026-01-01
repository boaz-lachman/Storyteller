import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons,FontAwesome6, FontAwesome5 } from '@expo/vector-icons';
import CharactersScreen from '../screens/entities/CharactersScreen';
import BlurbsScreen from '../screens/entities/BlurbsScreen';
import ScenesScreen from '../screens/entities/ScenesScreen';
import ChaptersScreen from '../screens/entities/ChaptersScreen';

const Tab = createMaterialTopTabNavigator();
  
  export default function StoryNavigator({ route }) {
    const { storyId } = route.params;
    
    return (
      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarIndicatorStyle: { backgroundColor: '#007AFF' },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
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
              <FontAwesome5 name={focused ? 'pen-fancy' : 'pen-fancy-outline'} size={20} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Scenes" 
          component={ScenesScreen}
          initialParams={{ storyId }}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <FontAwesome6 name={focused ? 'paragraph' : 'paragraph-outline'} size={20} color={color} />
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
      </Tab.Navigator>
    );
  }