/**
 * Root App Component
 * Handles font loading and initializes navigation
 * Includes Redux PersistGate for state persistence
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
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

/**
 * Root App Component
 */
export default function App() {
  const fontsLoaded = useLoadFonts();

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
