/**
 * Expo App Configuration
 * Dynamically loads configuration from environment variables
 * Supports both local development (.env) and EAS builds
 */
import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    expo: {
      ...(config?.expo || {}),
      name: 'Storyteller',
      slug: 'Storyteller',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      newArchEnabled: true,
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.boaz606.storyteller',
        googleServicesFile: './GoogleService-Info.plist',
        infoPlist: {
          NSMicrophoneUsageDescription: 'This app uses the microphone for audio interactions.',
          NSSpeechRecognitionUsageDescription: 'This app uses speech recognition to read your stories aloud.',
          NSSpeechSynthesisUsageDescription: 'This app uses text-to-speech to read your stories aloud.',
        },
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        googleServicesFile: './google-services.json',
        edgeToEdgeEnabled: true,
        package: 'com.boaz606.storyteller',
        predictiveBackGestureEnabled: false,
        permissions: [
          'android.permission.RECEIVE_BOOT_COMPLETED',
          'android.permission.WAKE_LOCK',
          'android.permission.RECORD_AUDIO',
          'android.permission.ACCESS_NETWORK_STATE',
          'android.permission.INTERNET',
          'android.permission.MODIFY_AUDIO_SETTINGS',
        ],
      },
      web: {
        favicon: './assets/favicon.png',
      },
      plugins: [
        'expo-router',
        [
          'expo-build-properties',
          {
            android: {
              usesCleartextTraffic: true,
            },
          },
        ],
        'expo-font',
        'expo-sqlite',
        'expo-secure-store',
        'expo-notifications',
        [
          'expo-background-fetch',
          {
            backgroundFetchConfig: {
              minimumInterval: 15,
              stopOnTerminate: false,
              startOnBoot: true,
            },
          },
        ],
        '@livekit/react-native-expo-plugin',
        '@config-plugins/react-native-webrtc',
      ],
      extra: {
        // Firebase configuration
        firebaseAPIKey: process.env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
        firebaseAuthDomain: process.env._FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        firebaseStorageBucket: process.envFIREBASE_STORAGE_BUCKET,
        firebaseIosAppId: process.env.FIREBASE_IOS_APP_ID,
        firebaseAndroidAppId: process.env.FIREBASE_ANDROID_APP_ID || process.env.FIREBASE_ANDRIOD_APP_ID,
        
        // Claude AI configuration
        claudeAPIKey: process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY,
        
        // ElevenLabs configuration
        elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY,
        
        // Router configuration
        router: {},
        
        // EAS configuration
        eas: {
          projectId: '10c8468b-a73d-43b5-827b-8838626041b2',
        },
      },
    },
  };
};
