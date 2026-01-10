/**
 * Speech Service
 * Handles text-to-speech functionality using expo-speech
 */
import * as Speech from 'expo-speech';

export interface Voice {
  identifier: string;
  name: string;
  quality?: number;
  language?: string;
}

export interface SpeechOptions {
  language?: string;
  pitch?: number; // 0.0 to 2.0, default 1.0
  rate?: number; // 0.0 to 1.0, default 0.5
  voice?: string; // Voice identifier
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

class SpeechService {
  private isInitialized = false;
  private availableVoices: Voice[] = [];
  private isSpeaking = false;
  private currentOptions: SpeechOptions | null = null;

  /**
   * Initialize the speech service
   * Loads available voices and checks permissions
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Configure audio mode for iOS (allow playback in silent mode)
      // This is handled by the app, but we log it here
      console.log('Initializing speech service...');
      
      // Get available voices
      await this.loadVoices();
      this.isInitialized = true;
      console.log('Speech service initialized successfully');
    } catch (error) {
      console.error('Error initializing speech service:', error);
      throw new Error(`Failed to initialize speech service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load available voices
   */
  async loadVoices(): Promise<void> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      this.availableVoices = voices.map((voice) => ({
        identifier: voice.identifier,
        name: voice.name || voice.identifier,
        quality: typeof voice.quality === 'number' ? voice.quality : undefined,
        language: voice.language,
      }));
      console.log(`Loaded ${this.availableVoices.length} available voices`);
    } catch (error) {
      console.error('Error loading voices:', error);
      // Continue with empty voices array - some platforms may not support this
      this.availableVoices = [];
    }
  }

  /**
   * Get available voices
   * @returns Array of available voices
   */
  getAvailableVoices(): Voice[] {
    return [...this.availableVoices];
  }

  /**
   * Get voices filtered by language
   * @param language - Language code (e.g., 'en-US', 'en-GB')
   * @returns Array of voices for the specified language
   */
  getVoicesByLanguage(language: string): Voice[] {
    return this.availableVoices.filter(
      (voice) => voice.language?.toLowerCase().startsWith(language.toLowerCase())
    );
  }

  /**
   * Check if speech is currently speaking
   * @returns True if speech is active
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Speak text
   * @param text - Text to speak
   * @param options - Speech options
   */
  async speak(text: string, options?: SpeechOptions): Promise<void> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Stop any current speech
    if (this.isSpeaking) {
      await this.stop();
    }

    try {
      this.currentOptions = options || {};
      this.isSpeaking = true;

      // Call onStart callback
      if (this.currentOptions.onStart) {
        this.currentOptions.onStart();
      }

      // Configure speech options
      // Note: expo-speech rate is 0.01 to 0.99 where 0.5 is normal speed (1.0x)
      // We need to map our 0.0-1.0 range to 0.01-0.99
      // 0.0 -> 0.01 (very slow), 0.5 -> 0.5 (normal), 1.0 -> 0.99 (very fast)
      let speechRate = options?.rate ?? 0.5;
      if (speechRate < 0) speechRate = 0;
      if (speechRate > 1) speechRate = 1;
      // Map 0.0-1.0 to 0.01-0.99
      // For 1.0x (normal), we want 0.5: 0.333 -> ~0.34 (slightly slower than normal)
      const mappedRate = 0.01 + (speechRate * 0.98);

      const speechOptions: Speech.SpeechOptions = {
        language: options?.language,
        pitch: options?.pitch ?? 1.0,
        rate: mappedRate,
        voice: options?.voice,
        onStart: () => {
          this.isSpeaking = true;
          if (this.currentOptions?.onStart) {
            this.currentOptions.onStart();
          }
        },
        onDone: () => {
          this.isSpeaking = false;
          if (this.currentOptions?.onDone) {
            this.currentOptions.onDone();
          }
          this.currentOptions = null;
        },
        onStopped: () => {
          this.isSpeaking = false;
          if (this.currentOptions?.onStopped) {
            this.currentOptions.onStopped();
          }
          this.currentOptions = null;
        },
        onError: (error: Error) => {
          this.isSpeaking = false;
          console.error('Speech error:', error);
          if (this.currentOptions?.onError) {
            this.currentOptions.onError(error);
          }
          this.currentOptions = null;
        },
      };

      // Speech.speak() is synchronous, doesn't return a promise
      Speech.speak(text, speechOptions);
      
      // Log for debugging
      console.log('Speech.speak() called:', {
        textLength: text.length,
        textPreview: text.substring(0, 100),
        rate: mappedRate,
        pitch: speechOptions.pitch,
        voice: speechOptions.voice || 'default',
        language: speechOptions.language,
      });
    } catch (error) {
      this.isSpeaking = false;
      this.currentOptions = null;
      console.error('Error speaking text:', error);
      throw new Error(`Failed to speak text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    if (!this.isSpeaking) {
      return;
    }

    try {
      await Speech.stop();
      this.isSpeaking = false;
      
      // Call onStopped callback if provided
      if (this.currentOptions?.onStopped) {
        this.currentOptions.onStopped();
      }
      
      this.currentOptions = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
      this.isSpeaking = false;
      this.currentOptions = null;
    }
  }

  /**
   * Pause speech (if supported)
   * Note: expo-speech doesn't support pause, so this will stop
   */
  async pause(): Promise<void> {
    await this.stop();
  }

  /**
   * Resume speech (if supported)
   * Note: expo-speech doesn't support resume, so this is a no-op
   */
  async resume(): Promise<void> {
    // expo-speech doesn't support pause/resume
    // This is a placeholder for future implementation
    console.warn('Resume is not supported by expo-speech');
  }

  /**
   * Check if speech is available on this platform
   * @returns True if speech is available
   */
  isAvailable(): boolean {
    // expo-speech is available on iOS and Android
    // Web support may vary
    return true;
  }

  /**
   * Get default voice for a language
   * @param language - Language code
   * @returns Default voice identifier or null
   */
  getDefaultVoice(language: string): string | null {
    const voices = this.getVoicesByLanguage(language);
    if (voices.length === 0) {
      return null;
    }

    // Prefer high quality voices
    const highQualityVoices = voices.filter((v) => v.quality && v.quality >= 300);
    if (highQualityVoices.length > 0) {
      return highQualityVoices[0].identifier;
    }

    return voices[0].identifier;
  }

  /**
   * Cleanup and reset service
   */
  async cleanup(): Promise<void> {
    if (this.isSpeaking) {
      await this.stop();
    }
    this.isInitialized = false;
    this.availableVoices = [];
    this.currentOptions = null;
  }
}

// Export singleton instance
export const speechService = new SpeechService();

// Export default
export default speechService;
