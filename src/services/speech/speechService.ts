/**
 * Speech Service
 * Handles text-to-speech functionality using expo-speech
 */
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

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
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  private availableVoices: Voice[] = [];
  private isSpeaking = false;
  private isPaused = false;
  private currentOptions: SpeechOptions | null = null;
  private textChunks: string[] = [];
  private currentChunkIndex = 0;
  private shouldContinueSpeaking = false;
  private remainingChunksForResume: string[] = []; // Store chunks for resume after pause
  private readonly MAX_CHUNK_SIZE = 4000; // Maximum characters per chunk
  private readonly MIN_CHUNK_SIZE = 500; // Minimum characters per chunk (for sentence boundary detection)

  /**
   * Initialize the speech service
   * Loads available voices and checks permissions
   * Prevents multiple concurrent initialization attempts
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }

    // If initialization is in progress, return the existing promise
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start new initialization
    this.isInitializing = true;
    this.initializationPromise = (async () => {
      try {
        // Configure audio mode for iOS (allow playback in silent mode)
        // This is handled by the app, but we log it here
        console.log('Initializing speech service...');
        
        // Get available voices
        await this.loadVoices();
        this.isInitialized = true;
        this.isInitializing = false;
        this.initializationPromise = null;
        console.log('Speech service initialized successfully');
      } catch (error) {
        this.isInitializing = false;
        this.initializationPromise = null;
        console.error('Error initializing speech service:', error);
        throw new Error(`Failed to initialize speech service: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();

    return this.initializationPromise;
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
   * Clean text by removing unnecessary characters that shouldn't be read aloud
   * Removes markdown headers (#), special formatting characters, etc.
   * @param text - Text to clean
   * @returns Cleaned text
   */
  private cleanText(text: string): string {
    let cleaned = text;

    // Remove markdown headers (# ## ### etc.)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // Remove markdown bold/italic markers that might be standalone (**, __, *, _)
    // But keep them if they're part of words
    cleaned = cleaned.replace(/(?<!\w)[*_]{1,2}(?!\w)/g, '');

    // Remove markdown links [text](url) but keep the text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Remove markdown image syntax ![alt](url)
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');

    // Remove markdown code blocks (```code```)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

    // Remove inline code (`code`)
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

    // Remove excessive whitespace (3+ spaces or newlines)
    cleaned = cleaned.replace(/\s{3,}/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove other markdown special characters that don't need to be spoken
    cleaned = cleaned.replace(/[<>{}|\\^~`]/g, '');

    // Trim and normalize whitespace
    cleaned = cleaned.trim().replace(/\s+/g, ' ');

    return cleaned;
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
          // If paused, don't reset - we'll resume from remaining chunks
          if (this.isPaused) {
            this.isSpeaking = false;
            // Don't reset chunks or index - we need them for resume
            // Save remaining chunks for resume
            if (this.currentChunkIndex > 0 && this.currentChunkIndex <= this.textChunks.length) {
              // We were in the middle of a chunk, save current + remaining chunks
              // Note: Since we can't resume mid-chunk, we'll restart from current chunk
              this.remainingChunksForResume = this.textChunks.slice(this.currentChunkIndex - 1);
            } else {
              // Current chunk was completed, save remaining chunks
              this.remainingChunksForResume = this.textChunks.slice(this.currentChunkIndex);
            }
            // Don't call onStopped callback when pausing
            return;
          }
          
          // Normal stop - reset everything
          this.isSpeaking = false;
          this.currentChunkIndex = 0;
          this.textChunks = [];
          this.shouldContinueSpeaking = false;
          this.remainingChunksForResume = [];
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

    // Clean text to remove unnecessary characters
    const cleanedText = this.cleanText(text);

    if (!cleanedText || cleanedText.trim().length === 0) {
      throw new Error('Text cannot be empty after cleaning');
    }

      // Stop any current speech (including paused state)
      if (this.isSpeaking || this.isPaused) {
        await this.stop();
      }

      try {
        this.currentOptions = options || {};
        this.isPaused = false;
        
        // Split text into chunks
        this.textChunks = this.splitTextIntoChunks(cleanedText);
        this.currentChunkIndex = 0;
        this.shouldContinueSpeaking = true;
        this.remainingChunksForResume = [];

      console.log('Starting chunked speech playback:', {
        originalTextLength: text.length,
        cleanedTextLength: cleanedText.length,
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
    if (!this.isSpeaking && !this.shouldContinueSpeaking && !this.isPaused) {
      return;
    }

    try {
      // Reset paused state if stopping
      this.isPaused = false;
      this.shouldContinueSpeaking = false;
      await Speech.stop();
      this.isSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      this.remainingChunksForResume = [];
      
      // Call onStopped callback if provided
      if (this.currentOptions?.onStopped) {
        this.currentOptions.onStopped();
      }
      
      this.currentOptions = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
      this.isSpeaking = false;
      this.isPaused = false;
      this.shouldContinueSpeaking = false;
      this.currentChunkIndex = 0;
      this.textChunks = [];
      this.remainingChunksForResume = [];
      this.currentOptions = null;
    }
  }

  /**
   * Check if speech is currently paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Pause speech
   * Saves the current position to allow resume from the same point
   * Only uses native pause on iOS (not supported on Android)
   */
  async pause(): Promise<void> {
    if (!this.isSpeaking) {
      return;
    }

    this.isPaused = true;
    
    // Only use native pause on iOS (Android doesn't support it)
    if (Platform.OS === 'ios') {
      try {
        await Speech.pause();
        
        // Note: onStopped won't fire with native pause, so handle it manually
        this.isSpeaking = false;
        
        // Save remaining chunks for resume
        if (this.currentChunkIndex > 0 && this.currentChunkIndex <= this.textChunks.length) {
          // We were in the middle of chunks, save from current chunk onwards
          // Note: Since we paused mid-chunk, we'll restart from current chunk
          this.remainingChunksForResume = this.textChunks.slice(this.currentChunkIndex - 1);
        } else {
          // All chunks before current were done, save remaining
          this.remainingChunksForResume = this.textChunks.slice(this.currentChunkIndex);
        }
        
        console.log('Speech paused (iOS native pause)', {
          currentChunkIndex: this.currentChunkIndex,
          totalChunks: this.textChunks.length,
          remainingChunks: this.remainingChunksForResume.length,
        });
      } catch (error) {
        // Fallback to stop approach if native pause fails
        console.log('Native pause failed, using stop approach', error);
        await Speech.stop();
        // onStopped callback will handle saving remaining chunks when isPaused is true
      }
    } else {
      // Android/Web: Use stop approach and save remaining chunks
      console.log('Using stop approach for pause (Android/Web)');
      await Speech.stop();
      // onStopped callback will handle saving remaining chunks when isPaused is true
    }
  }

  /**
   * Resume speech from where it was paused
   * Only uses native resume on iOS (not supported on Android)
   */
  async resume(): Promise<void> {
    if (!this.isPaused) {
      console.warn('Cannot resume: speech is not paused');
      return;
    }

    if (this.remainingChunksForResume.length === 0) {
      console.warn('Cannot resume: no remaining chunks');
      this.isPaused = false;
      return;
    }

    // Only use native resume on iOS (Android doesn't support it)
    if (Platform.OS === 'ios') {
      try {
        await Speech.resume();
        
        // If native resume works, we're done
        this.isSpeaking = true;
        this.isPaused = false;
        
        if (this.currentOptions?.onStart) {
          this.currentOptions.onStart();
        }
        
        console.log('Speech resumed with native resume (iOS)');
      } catch (error) {
        // Fallback to chunk-based resume if native resume fails
        console.log('Native resume failed, resuming from saved chunks', error);
        this.resumeFromChunks();
      }
    } else {
      // Android/Web: Manually resume from chunks
      console.log('Resuming from saved chunks (Android/Web)');
      this.resumeFromChunks();
    }
  }

  /**
   * Resume speech from saved chunks (used on Android/Web or as fallback)
   * @private
   */
  private resumeFromChunks(): void {
    // Restore chunks and continue from where we left off
    this.textChunks = [...this.remainingChunksForResume];
    this.currentChunkIndex = 0;
    this.shouldContinueSpeaking = true;
    this.isPaused = false;
    
    // Start speaking from the remaining chunks
    this.speakNextChunk();
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
    if (this.isSpeaking || this.shouldContinueSpeaking || this.isPaused) {
      await this.stop();
    }
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    this.availableVoices = [];
    this.currentOptions = null;
    this.textChunks = [];
    this.currentChunkIndex = 0;
    this.shouldContinueSpeaking = false;
    this.isPaused = false;
    this.remainingChunksForResume = [];
  }
}

// Export singleton instance
export const speechService = new SpeechService();

// Export default
export default speechService;
