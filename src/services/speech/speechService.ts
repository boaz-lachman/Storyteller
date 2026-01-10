/**
 * Speech Service
 * Handles text-to-speech functionality using ElevenLabs TTS API
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axiosInstance from '../api/axiosInstance';
import axios from 'axios';
import Constants from 'expo-constants';

// Type declarations for FileSystem properties that may not be in types
declare module 'expo-file-system' {
  export const cacheDirectory: string;
  export const documentDirectory: string;
  export enum EncodingType {
    UTF8 = 'utf8',
    Base64 = 'base64',
  }
}

export interface Voice {
  identifier: string;
  name: string;
  quality?: number;
  language?: string;
}

export interface SpeechOptions {
  language?: string;
  pitch?: number; // 0.0 to 2.0, default 1.0 (Note: ElevenLabs handles pitch differently)
  rate?: number; // 0.0 to 1.0, default 0.5 (maps to speed)
  voice?: string; // Voice ID from ElevenLabs
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
  onLoading?: (isLoading: boolean, chunkIndex?: number, totalChunks?: number) => void;
}

class SpeechService {
  private isInitialized = false;
  private availableVoices: Voice[] = [];
  private isSpeaking = false;
  private currentOptions: SpeechOptions | null = null;
  private textChunks: string[] = [];
  private currentChunkIndex = 0;
  private shouldContinueSpeaking = false;
  private audioSound: Audio.Sound | null = null;
  private readonly MAX_CHUNK_SIZE = 10000; // Maximum characters per chunk for ElevenLabs API
  private readonly MIN_CHUNK_SIZE = 1000; // Minimum characters per chunk
  private readonly ELEVENLABS_API_KEY: string;
  private readonly ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

  constructor() {
    // Get API key from environment
    const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 
                   Constants.expoConfig?.extra?.elevenlabsApiKey;
    
    if (!apiKey) {
      console.warn('ElevenLabs API key not found. TTS functionality may not work.');
      this.ELEVENLABS_API_KEY = '';
    } else {
      this.ELEVENLABS_API_KEY = apiKey;
    }
  }

  /**
   * Initialize the speech service
   * Loads available voices from ElevenLabs and sets up audio
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing ElevenLabs speech service...');
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Get available voices from ElevenLabs
      await this.loadVoices();
      this.isInitialized = true;
      console.log('ElevenLabs speech service initialized successfully');
    } catch (error) {
      console.error('Error initializing speech service:', error);
      throw new Error(`Failed to initialize speech service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load available voices from ElevenLabs API
   */
  async loadVoices(): Promise<void> {
    if (!this.ELEVENLABS_API_KEY) {
      console.warn('No API key available, using default voices');
      // Provide some default ElevenLabs voice options
      this.availableVoices = [
        { identifier: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel - ElevenLabs', language: 'en' },
        { identifier: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi - ElevenLabs', language: 'en' },
        { identifier: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella - ElevenLabs', language: 'en' },
        { identifier: 'ErXwobaYiN019PkySvjV', name: 'Antoni - ElevenLabs', language: 'en' },
        { identifier: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli - ElevenLabs', language: 'en' },
      ];
      return;
    }

    try {
      const response = await axiosInstance.get(`${this.ELEVENLABS_API_URL}/voices`, {
        headers: {
          'x-api-key': this.ELEVENLABS_API_KEY,
        },
      });

      if (response.data && response.data.voices) {
        this.availableVoices = response.data.voices.map((voice: any) => ({
          identifier: voice.voice_id,
          name: voice.name || voice.voice_id,
          language: voice.labels?.language || 'en',
          quality: voice.category === 'premade' ? 300 : 100,
        }));
        console.log(`Loaded ${this.availableVoices.length} voices from ElevenLabs`);
      } else {
        // Fallback to default voices if API response is unexpected
        this.availableVoices = [
          { identifier: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel - ElevenLabs', language: 'en' },
          { identifier: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi - ElevenLabs', language: 'en' },
        ];
      }
    } catch (error) {
      console.error('Error loading voices from ElevenLabs:', error);
      // Fallback to default voices on error
      this.availableVoices = [
        { identifier: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel - ElevenLabs (Default)', language: 'en' },
      ];
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
   * @param language - Language code (e.g., 'en-US', 'en-GB', 'en')
   * @returns Array of voices for the specified language
   */
  getVoicesByLanguage(language: string): Voice[] {
    const langCode = language.toLowerCase().split('-')[0];
    return this.availableVoices.filter(
      (voice) => voice.language?.toLowerCase().startsWith(langCode)
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
   * Split text into digestible chunks
   * Attempts to split at sentence boundaries when possible
   * @param text - Text to split
   * @returns Array of text chunks
   */
  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    
    // If text is small enough, return as single chunk
    if (text.length <= this.MAX_CHUNK_SIZE) {
      return [text.trim()];
    }

    // Split by sentences first (common sentence endings)
    const sentenceEndings = /([.!?]+\s+)/g;
    const sentences: string[] = [];
    let lastIndex = 0;
    let match;

    // Extract sentences
    while ((match = sentenceEndings.exec(text)) !== null) {
      const sentence = text.substring(lastIndex, match.index + match[0].length);
      if (sentence.trim()) {
        sentences.push(sentence.trim());
      }
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim();
      if (remaining) {
        sentences.push(remaining);
      }
    }

    // If no sentence boundaries found, split by paragraphs
    if (sentences.length === 0) {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
      if (paragraphs.length > 0) {
        sentences.push(...paragraphs.map(p => p.trim()));
      } else {
        // Last resort: split by newlines
        sentences.push(...text.split(/\n+/).filter(p => p.trim()));
      }
    }

    // Group sentences into chunks
    let currentChunk = '';
    for (const sentence of sentences) {
      // If adding this sentence would exceed max size, save current chunk and start new one
      if (currentChunk.length + sentence.length + 1 > this.MAX_CHUNK_SIZE && currentChunk.length >= this.MIN_CHUNK_SIZE) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // Add sentence to current chunk
        if (currentChunk) {
          currentChunk += ' ' + sentence;
        } else {
          currentChunk = sentence;
        }

        // If current chunk exceeds max size, force split
        if (currentChunk.length > this.MAX_CHUNK_SIZE) {
          // Split at word boundaries within the chunk
          const words = currentChunk.split(/\s+/);
          let wordChunk = '';
          for (const word of words) {
            if (wordChunk.length + word.length + 1 > this.MAX_CHUNK_SIZE && wordChunk.length >= this.MIN_CHUNK_SIZE) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              wordChunk = wordChunk ? wordChunk + ' ' + word : word;
            }
          }
          currentChunk = wordChunk;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Ensure we have at least one chunk
    if (chunks.length === 0) {
      chunks.push(text.trim());
    }

    console.log(`Split text into ${chunks.length} chunks`, {
      totalLength: text.length,
      chunkSizes: chunks.map(c => c.length),
    });

    return chunks;
  }

  /**
   * Generate audio from text using ElevenLabs TTS API
   * @param text - Text to convert to speech
   * @param voiceId - ElevenLabs voice ID
   * @param stability - Voice stability (0.0 to 1.0)
   * @param similarityBoost - Similarity boost (0.0 to 1.0)
   * @param speed - Speech speed (0.25 to 4.0, default 1.0)
   * @returns URI of the generated audio file
   */
  private async generateAudioFromText(
    text: string,
    voiceId: string,
    stability: number = 0.5,
    similarityBoost: number = 0.75,
    speed: number = 1.0
  ): Promise<string> {
    if (!this.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key is not configured');
    }

    try {
      const response = await axiosInstance.post(
        `${this.ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.ELEVENLABS_API_KEY,
          },
        }
      );

      // Save audio to temporary file
      // Use cacheDirectory if available, otherwise use documentDirectory
      const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
      const audioUri = `${cacheDir}elevenlabs_audio_${Date.now()}.mp3`;
      
      // Convert ArrayBuffer response to base64 string
      const uint8Array = new Uint8Array(response.data);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Audio = Buffer.from(binary, 'binary').toString('base64');
      
      await FileSystem.writeAsStringAsync(audioUri, base64Audio, {
        encoding: 'base64' as any,
      });

      return audioUri;
    } catch (error) {
      console.error('Error generating audio from ElevenLabs:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`ElevenLabs TTS API error: ${error.response?.data?.detail?.message || error.message}`);
      }
      throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Play audio chunk
   * @private
   */
  private async playAudioChunk(audioUri: string): Promise<void> {
    // Unload previous sound if exists
    if (this.audioSound) {
      await this.audioSound.unloadAsync().catch(console.error);
      this.audioSound = null;
    }

    // Create new sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true, volume: 1.0, isLooping: false }
    );

    this.audioSound = sound;

    // Wait for playback to finish
    return new Promise<void>((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            if (status.didJustFinish) {
              resolve();
            } else if (status.isPlaying) {
              // Still playing, check again
              setTimeout(checkStatus, 100);
            } else {
              // Not playing and not finished, might be an error
              setTimeout(checkStatus, 100);
            }
          } else {
            // Not loaded, might be an error or still loading
            setTimeout(checkStatus, 100);
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Unknown error checking audio status'));
        }
      };

      // Set up playback status listener for immediate notification
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          resolve();
        }
      });

      // Also poll status as backup
      checkStatus();
    });
  }

  /**
   * Speak the next chunk in the queue
   * @private
   */
  private async speakNextChunk(): Promise<void> {
    if (!this.shouldContinueSpeaking || this.currentChunkIndex >= this.textChunks.length) {
      // All chunks spoken
      this.isSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      this.shouldContinueSpeaking = false;

      if (this.audioSound) {
        await this.audioSound.unloadAsync().catch(console.error);
        this.audioSound = null;
      }

      if (this.currentOptions?.onDone) {
        this.currentOptions.onDone();
      }
      this.currentOptions = null;
      return;
    }

    const chunk = this.textChunks[this.currentChunkIndex];
    this.currentChunkIndex++;

    try {
      // Get voice ID (default to Rachel if not specified)
      const voiceId = this.currentOptions?.voice || '21m00Tcm4TlvDq8ikWAM';
      
      // Map rate (0.0-1.0) to speed (0.25-4.0)
      // 0.0 -> 0.25x (very slow), 0.5 -> 1.0x (normal), 1.0 -> 2.0x (fast)
      const rate = this.currentOptions?.rate ?? 0.5;
      const speed = 0.25 + (rate * 1.75); // Map 0.0-1.0 to 0.25-2.0

      // Map pitch to stability (lower pitch = higher stability)
      const pitch = this.currentOptions?.pitch ?? 1.0;
      const stability = Math.max(0.0, Math.min(1.0, 1.0 - (pitch - 1.0) * 0.5));

      console.log(`Generating audio for chunk ${this.currentChunkIndex}/${this.textChunks.length}`, {
        chunkLength: chunk.length,
        voiceId,
        speed,
        stability,
      });

      // Notify loading started
      if (this.currentOptions?.onLoading) {
        this.currentOptions.onLoading(true, this.currentChunkIndex, this.textChunks.length);
      }

      // Only call onStart for the first chunk
      if (this.currentChunkIndex === 1 && this.currentOptions?.onStart) {
        this.currentOptions.onStart();
      }

      this.isSpeaking = true;

      // Generate audio from text
      let audioUri: string;
      try {
        audioUri = await this.generateAudioFromText(chunk, voiceId, stability, 0.75, speed);
      } catch (error) {
        // Notify loading stopped on error
        if (this.currentOptions?.onLoading) {
          this.currentOptions.onLoading(false);
        }
        throw error;
      }

      // Notify loading completed (audio generated, now playing)
      if (this.currentOptions?.onLoading) {
        this.currentOptions.onLoading(false);
      }

      // Play audio
      await this.playAudioChunk(audioUri);

      // Clean up audio file after playback
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (error) {
        console.warn('Error deleting audio file:', error);
      }

      // Continue with next chunk if should continue
      if (this.shouldContinueSpeaking) {
        // Small delay between chunks for natural pause
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.speakNextChunk();
      }
    } catch (error) {
      console.error('Error speaking chunk:', error);
      this.isSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      this.shouldContinueSpeaking = false;
      
      if (this.audioSound) {
        await this.audioSound.unloadAsync().catch(console.error);
        this.audioSound = null;
      }

      // Notify loading stopped on error
      if (this.currentOptions?.onLoading) {
        this.currentOptions.onLoading(false);
      }

      if (this.currentOptions?.onError) {
        this.currentOptions.onError(error instanceof Error ? error : new Error('Unknown error'));
      }
      this.currentOptions = null;
    }
  }

  /**
   * Speak text (with automatic chunking for large texts)
   * @param text - Text to speak
   * @param options - Speech options
   */
  async speak(text: string, options?: SpeechOptions): Promise<void> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (!this.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key is not configured. Please set EXPO_PUBLIC_ELEVENLABS_API_KEY.');
    }

    // Stop any current speech
    if (this.isSpeaking) {
      await this.stop();
    }

    try {
      this.currentOptions = options || {};
      
      // Split text into chunks
      this.textChunks = this.splitTextIntoChunks(text);
      this.currentChunkIndex = 0;
      this.shouldContinueSpeaking = true;

      console.log('Starting ElevenLabs TTS playback:', {
        totalTextLength: text.length,
        numberOfChunks: this.textChunks.length,
        speechRate: options?.rate,
        pitch: options?.pitch,
        voice: options?.voice || 'default',
        language: options?.language,
      });

      // Start speaking the first chunk
      await this.speakNextChunk();
    } catch (error) {
      this.isSpeaking = false;
      this.currentOptions = null;
      this.textChunks = [];
      this.currentChunkIndex = 0;
      this.shouldContinueSpeaking = false;
      console.error('Error initiating speech:', error);
      throw new Error(`Failed to speak text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    if (!this.isSpeaking && !this.shouldContinueSpeaking) {
      return;
    }

    try {
      this.shouldContinueSpeaking = false;
      this.isSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];

      if (this.audioSound) {
        await this.audioSound.stopAsync();
        await this.audioSound.unloadAsync();
        this.audioSound = null;
      }
      
      // Call onStopped callback if provided
      if (this.currentOptions?.onStopped) {
        this.currentOptions.onStopped();
      }
      
      this.currentOptions = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
      this.isSpeaking = false;
      this.shouldContinueSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      if (this.audioSound) {
        await this.audioSound.unloadAsync().catch(console.error);
        this.audioSound = null;
      }
      this.currentOptions = null;
    }
  }

  /**
   * Pause speech
   */
  async pause(): Promise<void> {
    if (this.audioSound && this.isSpeaking) {
      try {
        await this.audioSound.pauseAsync();
      } catch (error) {
        console.error('Error pausing speech:', error);
      }
    }
  }

  /**
   * Resume speech
   */
  async resume(): Promise<void> {
    if (this.audioSound && this.isSpeaking) {
      try {
        await this.audioSound.playAsync();
      } catch (error) {
        console.error('Error resuming speech:', error);
      }
    }
  }

  /**
   * Check if speech is available on this platform
   * @returns True if speech is available (requires API key)
   */
  isAvailable(): boolean {
    return !!this.ELEVENLABS_API_KEY;
  }

  /**
   * Get default voice for a language
   * @param language - Language code
   * @returns Default voice identifier or null
   */
  getDefaultVoice(language: string): string | null {
    const voices = this.getVoicesByLanguage(language);
    if (voices.length === 0) {
      // Return default ElevenLabs voice if no voices found
      return '21m00Tcm4TlvDq8ikWAM'; // Rachel
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
    if (this.isSpeaking || this.shouldContinueSpeaking) {
      await this.stop();
    }
    this.isInitialized = false;
    this.availableVoices = [];
    this.currentOptions = null;
    this.textChunks = [];
    this.currentChunkIndex = 0;
    this.shouldContinueSpeaking = false;
    if (this.audioSound) {
      await this.audioSound.unloadAsync().catch(console.error);
      this.audioSound = null;
    }
  }
}

// Export singleton instance
export const speechService = new SpeechService();

// Export default
export default speechService;
