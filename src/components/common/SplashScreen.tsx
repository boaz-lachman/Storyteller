/**
 * Splash Screen Component
 * Displays app branding using Logo component during app initialization
 * Uses expo-splash-screen for native splash screen management
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import Logo from './Logo';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface SplashScreenProps {
  onFinish?: () => void;
}

/**
 * Splash Screen Component
 * Shows app branding with animated logo
 */
export default function AppSplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate logo appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Logo fontSize="display" color={colors.primary} />
      </Animated.View>
    </View>
  );
}

// Export function to hide splash screen
export const hideSplashScreen = async () => {
  try {
    await SplashScreen.hideAsync();
  } catch (error) {
    console.warn('Error hiding splash screen:', error);
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
