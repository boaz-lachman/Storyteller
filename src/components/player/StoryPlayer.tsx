/**
 * Story Player Component
 * Text-to-speech player for reading stories aloud
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Text, Card, Menu } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { speechService, type Voice } from '../../services/speech/speechService';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

export interface StoryPlayerProps {
  text: string;
  onStateChange?: (isPlaying: boolean) => void;
}

type PlayerState = 'idle' | 'playing' | 'stopped';

/**
 * Story Player Component
 */
export const StoryPlayer: React.FC<StoryPlayerProps> = ({
  text,
  onStateChange,
}) => {
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [allVoices, setAllVoices] = useState<Voice[]>([]); // Store all voices for lookup
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(0.533); // 0.0 to 1.0 (maps to 0.5x-2.0x, 0.533 ≈ 1.3x)
  const [speechPitch, setSpeechPitch] = useState(1.0); // 0.0 to 2.0
  const [voiceMenuVisible, setVoiceMenuVisible] = useState(false);
  const [hasVoicesForLocale, setHasVoicesForLocale] = useState(false);
  const appState = useRef(AppState.currentState);

  // Get device locale
  const getDeviceLocale = useCallback((): string => {
    try {
      // Try expo-localization first
      const locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        const languageTag = locales[0].languageTag;
        if (languageTag) {
          // Extract language code (e.g., 'en' from 'en-US')
          return languageTag.split('-')[0].toLowerCase();
        }
      }
    } catch (error) {
      console.warn('Error getting locale from expo-localization:', error);
    }

    // Fallback to Intl API
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      return locale.split('-')[0].toLowerCase();
    } catch (error) {
      console.warn('Error getting locale from Intl:', error);
    }

    // Final fallback
    return 'en';
  }, []);

  // Initialize speech service
  useEffect(() => {
    const initialize = async () => {
      try {
        await speechService.initialize();
        const voicesList = speechService.getAvailableVoices();
        setAllVoices(voicesList); // Store all voices for lookup
        
        // Get device locale and filter voices
        const deviceLocale = getDeviceLocale();
        const filteredVoices = speechService.getVoicesByLanguage(deviceLocale);
        
        // Check if there are voices for the locale
        const hasVoices = filteredVoices.length > 0;
        setHasVoicesForLocale(hasVoices);
        
        // If no voices found for locale, don't show the player
        if (!hasVoices) {
          setIsInitialized(true);
          return;
        }
        
        // Use filtered voices for the locale
        setAvailableVoices(filteredVoices);
        
        // Set default voice (prefer device locale)
        // Ensure a voice is always selected if any voices are available
        let defaultVoice = speechService.getDefaultVoice(deviceLocale);
        if (!defaultVoice && filteredVoices.length > 0) {
          // Prefer high quality voices, then first available
          defaultVoice = filteredVoices.find(v => v.quality && v.quality > 0)?.identifier || filteredVoices[0]?.identifier;
        }
        setSelectedVoice(defaultVoice || null);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing speech service:', error);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      speechService.cleanup();
    };
  }, [getDeviceLocale]);

  // Handle app state changes (interruptions)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        playerState === 'playing'
      ) {
        // App came to foreground while playing - continue playing
        console.log('App has come to the foreground');
      }

      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/) &&
        playerState === 'playing'
      ) {
        // App went to background while playing - stop
        speechService.stop().catch(console.error);
        setPlayerState('stopped');
        console.log('App has gone to the background');
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [playerState]);

  // Update parent component when state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(playerState === 'playing');
    }
  }, [playerState, onStateChange]);

  // Clean text for speech (remove HTML tags, normalize whitespace, etc.)
  const cleanTextForSpeech = useCallback((inputText: string): string => {
    if (!inputText) return '';
    
    let cleaned = inputText;
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    // Normalize whitespace (replace multiple spaces/newlines with single space)
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }, []);

  // Handle play
  const handlePlay = useCallback(async () => {
    if (!text || text.trim().length === 0) {
      console.warn('Cannot play: text is empty');
      return;
    }

    // Clean the text before speaking
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText || cleanedText.trim().length === 0) {
      console.warn('Cannot play: cleaned text is empty');
      return;
    }

    console.log('Starting speech playback:', {
      textLength: cleanedText.length,
      firstChars: cleanedText.substring(0, 50),
      speechRate,
      pitch: speechPitch,
      voice: selectedVoice,
      playerState,
    });

    try {
      // Stop any current speech first
      if (playerState === 'playing') {
        await speechService.stop();
      }

      // Start playing
      await speechService.speak(cleanedText, {
        language: 'en-US',
        rate: speechRate,
        pitch: speechPitch,
        voice: selectedVoice || undefined,
        onStart: () => {
          console.log('Speech playback started');
          setPlayerState('playing');
        },
        onDone: () => {
          console.log('Speech playback completed');
          setPlayerState('idle');
        },
        onStopped: () => {
          console.log('Speech playback stopped');
          setPlayerState('stopped');
        },
        onError: (error) => {
          console.error('Speech playback error:', error);
          setPlayerState('idle');
        },
      });
    } catch (error) {
      console.error('Error playing story:', error);
      setPlayerState('idle');
    }
  }, [text, speechRate, speechPitch, selectedVoice, playerState, cleanTextForSpeech]);

  // Handle stop
  const handleStop = useCallback(async () => {
    try {
      await speechService.stop();
      setPlayerState('stopped');
    } catch (error) {
      console.error('Error stopping story:', error);
    }
  }, []);

  // Increase speed
  const handleIncreaseSpeed = useCallback(() => {
    setSpeechRate((prev) => Math.min(1.0, prev + 0.1));
  }, []);

  // Decrease speed
  const handleDecreaseSpeed = useCallback(() => {
    setSpeechRate((prev) => Math.max(0.0, prev - 0.1));
  }, []);

  // Format speed for display (0.0-1.0 to 0.5x-2.0x)
  const formatSpeed = (rate: number): string => {
    // Map 0.0-1.0 to 0.5x-2.0x
    const speed = 0.5 + rate * 1.5;
    return `${speed.toFixed(1)}x`;
  };

  // Get selected voice name
  const getSelectedVoiceName = (): string => {
    if (!selectedVoice) return 'Default Voice';
    // First try to find in available voices, then in all voices
    const voice = availableVoices.find((v) => v.identifier === selectedVoice) ||
                  allVoices.find((v) => v.identifier === selectedVoice);
    return voice?.name || voice?.identifier || 'Default Voice';
  };

  if (!isInitialized) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.initializingText}>Initializing player...</Text>
        </Card.Content>
      </Card>
    );
  }

  // Don't display the player if there are no voices for the locale
  if (!hasVoicesForLocale) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>Audio Player</Text>
        </View>

        {/* Voice Selection */}
        <View style={styles.voiceControlRow}>
          <Text style={[styles.label, playerState === 'playing' && styles.disabledLabel]}>Voice:</Text>
          <Menu
            key={`voice-menu-${selectedVoice || 'none'}`}
            visible={voiceMenuVisible && playerState !== 'playing'}
            onDismiss={() => setVoiceMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[
                  styles.voiceSelector,
                  playerState === 'playing' && styles.voiceSelectorDisabled
                ]}
                onPress={() => {
                  if (playerState !== 'playing') {
                    setVoiceMenuVisible(true);
                  }
                }}
                disabled={playerState === 'playing'}
              >
                <Text
                  style={[
                    styles.voiceText,
                    playerState === 'playing' && styles.voiceTextDisabled
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {getSelectedVoiceName()}
                </Text>
                <Feather
                  name="chevron-down"
                  size={16}
                  color={playerState === 'playing' ? colors.textTertiary : colors.primary}
                />
              </TouchableOpacity>
            }
          >
            {availableVoices.length > 0 ? (
              availableVoices.map((voice) => (
                <Menu.Item
                  key={voice.identifier}
                  onPress={() => {
                    setSelectedVoice(voice.identifier);
                    setVoiceMenuVisible(false);
                  }}
                  title={voice.name || voice.identifier}
                />
              ))
            ) : (
              <Menu.Item
                onPress={() => {
                  setVoiceMenuVisible(false);
                }}
                title="No voices available"
                disabled
              />
            )}
          </Menu>
        </View>

        {/* Speed Control */}
        <View style={styles.controlRow}>
          <Text style={[styles.label, playerState === 'playing' && styles.disabledLabel]}>Speed:</Text>
          <View style={styles.speedControls}>
            <TouchableOpacity
              style={[
                styles.speedButton,
                playerState === 'playing' && styles.speedButtonDisabled
              ]}
              onPress={handleDecreaseSpeed}
              disabled={playerState === 'playing' || speechRate <= 0.0}
            >
              <Feather
                name="minus"
                size={20}
                color={
                  playerState === 'playing' || speechRate <= 0.0
                    ? colors.textTertiary
                    : colors.primary
                }
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.speedValue,
                playerState === 'playing' && styles.speedValueDisabled
              ]}
            >
              {formatSpeed(speechRate)}
            </Text>
            <TouchableOpacity
              style={[
                styles.speedButton,
                playerState === 'playing' && styles.speedButtonDisabled
              ]}
              onPress={handleIncreaseSpeed}
              disabled={playerState === 'playing' || speechRate >= 1.0}
            >
              <Feather
                name="plus"
                size={20}
                color={
                  playerState === 'playing' || speechRate >= 1.0
                    ? colors.textTertiary
                    : colors.primary
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.playbackControls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStop}
            disabled={playerState === 'idle' || playerState === 'stopped'}
          >
            <Feather
              name="square"
              size={24}
              color={
                playerState === 'idle' || playerState === 'stopped'
                  ? colors.textTertiary
                  : colors.text
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.playPauseButton]}
            onPress={handlePlay}
            disabled={!text || text.trim().length === 0 || playerState === 'playing'}
          >
            <Feather
              name="play"
              size={32}
              color={
                !text || text.trim().length === 0 || playerState === 'playing'
                  ? colors.textTertiary
                  : colors.primary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Status Display */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {playerState === 'playing'
              ? 'Playing...'
              : playerState === 'stopped'
              ? 'Stopped'
              : 'Ready'}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  initializingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  voiceControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
    minWidth: 60,
  },
  voiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    width: '90%',
    minHeight: 36,
  },
  voiceSelectorDisabled: {
    opacity: 0.5,
    backgroundColor: colors.background + '80',
  },
  voiceText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  voiceTextDisabled: {
    color: colors.textSecondary,
  },
  disabledLabel: {
    opacity: 0.5,
    color: colors.textSecondary,
  },
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 2,
    justifyContent: 'flex-end',
  },
  speedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.background + '80',
  },
  speedValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  speedValueDisabled: {
    opacity: 0.5,
    color: colors.textSecondary,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  stopButton: {
    backgroundColor: colors.background,
  },
  statusRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});

export default StoryPlayer;
