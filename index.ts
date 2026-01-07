import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';

// Enable native screens for better performance
// This must be called before any navigation components are rendered
enableScreens();

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
