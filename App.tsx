/**
 * Root App Component
 * Handles font loading and initializes navigation
 * Includes Redux PersistGate for state persistence
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';
import { store, persistor } from './src/store';
import { useLoadFonts } from './src/utils/fonts';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/constants/colors';
import MainBookActivityIndicator from './src/components/common/MainBookActivityIndicator';
import Snackbar from './src/components/common/Snackbar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppSelector } from './src/hooks/redux';
import { selectIsRTL } from './src/store/slices/languageSlice';

/**
 * Inner App Component
 * Handles RTL initialization after Redux store is available
 */
function InnerApp() {
  const fontsLoaded = useLoadFonts();
  const isRTL = useAppSelector(selectIsRTL);

  // Initialize RTL on app start and when language changes
  useEffect(() => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
      // Note: Full RTL layout changes may require app restart on some platforms
    }
  }, [isRTL]);

  // Show loading indicator while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
      </View>
    );
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
            loading={
              <View style={styles.loadingContainer}>
                <MainBookActivityIndicator size={80} />
              </View>
            }
            persistor={persistor}
          >
            <InnerApp />
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );

  // Show loading indicator while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <PersistGate 
            loading={
              <View style={styles.loadingContainer}>
                <MainBookActivityIndicator size={80} />
              </View>
            }
            persistor={persistor}
          >
            <PaperProvider>
              <View style={styles.container}>
                <AppNavigator />
                <Snackbar />
              </View>
              <StatusBar style="auto" />
            </PaperProvider>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
