import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface TTSFallbackOptions {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: 'en' | 'es'; // Language for multilingual TTS
}

export class FallbackTTSService {
  private static speechTTSPipeline: any = null;
  private static isInitializing = false;

  // Initialize local TTS model
  private static async initializeSpeechT5(): Promise<void> {
    if (this.speechTTSPipeline || this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      console.log('Initializing local SpeechT5 TTS model...');
      this.speechTTSPipeline = await pipeline(
        'text-to-speech',
        'Xenova/speecht5_tts',
        { device: 'webgpu' }
      );
      console.log('Local TTS model initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize local TTS model:', error);
      this.speechTTSPipeline = null;
    } finally {
      this.isInitializing = false;
    }
  }

  // Web Speech API fallback
  static async speakWithWebSpeech(options: TTSFallbackOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(options.text);
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // Set language
      const lang = options.language || 'en';
      const langCode = lang === 'es' ? 'es-ES' : 'en-US';
      utterance.lang = langCode;

      // Try to find a specific voice for the language
      const voices = speechSynthesis.getVoices();
      
      // Prioritize: specific voiceId > language-matching female voice > any language voice
      let selectedVoice = null;
      
      if (options.voiceId) {
        selectedVoice = voices.find(v => 
          v.name.toLowerCase().includes(options.voiceId!.toLowerCase())
        );
      }
      
      if (!selectedVoice) {
        // Find female voice for the language
        selectedVoice = voices.find(v => 
          v.lang.startsWith(lang) && v.name.toLowerCase().includes('female')
        );
      }
      
      if (!selectedVoice) {
        // Find any voice for the language
        selectedVoice = voices.find(v => v.lang.startsWith(lang));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`🎤 Fallback TTS using ${lang === 'es' ? 'Spanish' : 'English'} voice:`, selectedVoice.name);
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      speechSynthesis.speak(utterance);
    });
  }

  // Local TTS model fallback
  static async speakWithLocalModel(options: TTSFallbackOptions): Promise<void> {
    try {
      await this.initializeSpeechT5();
      
      if (!this.speechTTSPipeline) {
        throw new Error('Local TTS model not available');
      }

      console.log('Generating speech with local model...');
      const result = await this.speechTTSPipeline(options.text);
      
      // Convert result to audio and play
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(result.audio.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      return new Promise((resolve, reject) => {
        source.onended = () => resolve();
        source.addEventListener('error', reject);
        source.start();
      });
    } catch (error) {
      console.error('Local TTS model failed:', error);
      throw error;
    }
  }

  // Unified TTS with fallback chain (browser-first, local model removed for performance)
  static async speak(options: TTSFallbackOptions): Promise<{ method: string }> {
    const methods = [
      { name: 'Web Speech API', fn: () => this.speakWithWebSpeech(options) }
      // Removed Local TTS Model (too slow and unreliable for production)
    ];

    for (const method of methods) {
      try {
        console.log(`Attempting TTS with: ${method.name}`);
        await method.fn();
        console.log(`TTS successful with: ${method.name}`);
        return { method: method.name };
      } catch (error) {
        console.warn(`${method.name} failed:`, error);
        continue;
      }
    }

    throw new Error('All TTS fallback methods failed');
  }
}