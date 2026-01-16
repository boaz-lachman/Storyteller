/**
 * Root App Component
 * Handles font loading and initializes navigation
 * Includes Redux PersistGate for state persistence
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';
import { store, persistor } from './src/store';
import { useLoadFonts } from './src/utils/fonts';
import AppNavigator from './src/navigation/AppNavigator';
import Snackbar from './src/components/common/Snackbar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppSelector } from './src/hooks/redux';
import { selectIsRTL } from './src/store/slices/languageSlice';
import AppSplashScreen, { hideSplashScreen } from './src/components/common/SplashScreen';

/**
 * Inner App Component
 * Handles RTL initialization after Redux store is available
 */
function InnerApp() {
  const fontsLoaded = useLoadFonts();
  const isRTL = useAppSelector(selectIsRTL);
  const [appIsReady, setAppIsReady] = useState(false);

  // Initialize RTL on app start and when language changes
  useEffect(() => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
      // Note: Full RTL layout changes may require app restart on some platforms
    }
  }, [isRTL]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded && !appIsReady) {
      // Small delay to show splash screen
      const timer = setTimeout(async () => {
        await hideSplashScreen();
        setAppIsReady(true);
      }, 1000); // Show splash for at least 1 second

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, appIsReady]);

  // Show splash screen while loading
  if (!appIsReady) {
    return <AppSplashScreen />;
  }

  return (
    <PaperProvider>
      <View style={styles.container}>
        <AppNavigator />
        <Snackbar />
      </View>
      <StatusBar style="auto" />
    </PaperProvider>
  );
}

/**
 * Root App Component
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <PersistGate 
            loading={<AppSplashScreen />}
            persistor={persistor}
          >
            <InnerApp />
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
