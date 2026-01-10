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
  private textChunks: string[] = [];
  private currentChunkIndex = 0;
  private shouldContinueSpeaking = false;
  private readonly MAX_CHUNK_SIZE = 4000; // Maximum characters per chunk
  private readonly MIN_CHUNK_SIZE = 500; // Minimum characters per chunk (for sentence boundary detection)

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
   * Speak the next chunk in the queue
   * @private
   */
  private speakNextChunk(): void {
    if (!this.shouldContinueSpeaking || this.currentChunkIndex >= this.textChunks.length) {
      // All chunks spoken
      this.isSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      this.shouldContinueSpeaking = false;

      if (this.currentOptions?.onDone) {
        this.currentOptions.onDone();
      }
      this.currentOptions = null;
      return;
    }

    const chunk = this.textChunks[this.currentChunkIndex];
    this.currentChunkIndex++;

    try {
      // Configure speech options
      let speechRate = this.currentOptions?.rate ?? 0.5;
      if (speechRate < 0) speechRate = 0;
      if (speechRate > 1) speechRate = 1;
      const mappedRate = 0.01 + (speechRate * 0.98);

      const speechOptions: Speech.SpeechOptions = {
        language: this.currentOptions?.language,
        pitch: this.currentOptions?.pitch ?? 1.0,
        rate: mappedRate,
        voice: this.currentOptions?.voice,
        onStart: () => {
          this.isSpeaking = true;
          // Only call onStart for the first chunk
          if (this.currentChunkIndex === 1 && this.currentOptions?.onStart) {
            this.currentOptions.onStart();
          }
        },
        onDone: () => {
          // Wait a small delay before speaking next chunk (for natural pause)
          setTimeout(() => {
            if (this.shouldContinueSpeaking) {
              this.speakNextChunk();
            }
          }, 100); // 100ms pause between chunks
        },
        onStopped: () => {
          this.isSpeaking = false;
          this.currentChunkIndex = 0;
          this.textChunks = [];
          this.shouldContinueSpeaking = false;
          if (this.currentOptions?.onStopped) {
            this.currentOptions.onStopped();
          }
          this.currentOptions = null;
        },
        onError: (error: Error) => {
          console.error('Speech error in chunk:', error);
          this.isSpeaking = false;
          this.currentChunkIndex = 0;
          this.textChunks = [];
          this.shouldContinueSpeaking = false;
          if (this.currentOptions?.onError) {
            this.currentOptions.onError(error);
          }
          this.currentOptions = null;
        },
      };

      console.log(`Speaking chunk ${this.currentChunkIndex}/${this.textChunks.length}`, {
        chunkLength: chunk.length,
        chunkPreview: chunk.substring(0, 50) + '...',
      });

      Speech.speak(chunk, speechOptions);
    } catch (error) {
      console.error('Error speaking chunk:', error);
      this.isSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      this.shouldContinueSpeaking = false;
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

      console.log('Starting chunked speech playback:', {
        totalTextLength: text.length,
        numberOfChunks: this.textChunks.length,
        speechRate: options?.rate,
        pitch: options?.pitch,
        voice: options?.voice || 'default',
        language: options?.language,
      });

      // Start speaking the first chunk
      this.speakNextChunk();
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
      await Speech.stop();
      this.isSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      
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
    if (this.isSpeaking || this.shouldContinueSpeaking) {
      await this.stop();
    }
    this.isInitialized = false;
    this.availableVoices = [];
    this.currentOptions = null;
    this.textChunks = [];
    this.currentChunkIndex = 0;
    this.shouldContinueSpeaking = false;
  }
}

// Export singleton instance
export const speechService = new SpeechService();

// Export default
export default speechService;
