import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../hooks/redux';
import { selectUser } from '../store/slices/authSlice';
import AuthNavigator from './AuthNavigator';
import StoriesListScreen from '../screens/stories/StoriesListScreen';
import StoryNavigator from './StoryNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const user = useAppSelector(selectUser);
    
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : (
            <>
              <Stack.Screen 
                name="StoriesList" 
                component={StoriesListScreen}
                options={{ title: 'My Stories' }}
              />
              <Stack.Screen 
                name="StoryDetail" 
                component={StoryNavigator}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }