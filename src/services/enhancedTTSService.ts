import { unifiedTTSService, UnifiedTTSOptions } from './unifiedTTSService';

/**
 * Enhanced TTS Service - Browser-only speech synthesis
 * Uses Web Speech API for 100% reliability across all browsers, online and offline
 */
export class EnhancedTTSService {
  private static instance: EnhancedTTSService;
  private lastMethod = 'Web Speech API';
  private initialized = false;

  private constructor() {}

  static getInstance(): EnhancedTTSService {
    if (!this.instance) {
      this.instance = new EnhancedTTSService();
    }
    return this.instance;
  }

  private toSpeechFriendlyText(text: string): string {
    return text
      // Remove code entirely so TTS doesn't read symbols/syntax aloud
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      // Headings
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      // Blockquotes
      .replace(/^\s{0,3}>\s?/gm, '')
      // Bold / italic / strikethrough
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      // Markdown links/images: keep the human-readable label
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      // Bullets and task lists
      .replace(/^\s*[-*+]\s+\[.\]\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      // Ordered lists
      .replace(/^\s*\d+\.\s+/gm, '')
      // Horizontal rules
      .replace(/^\s*([-*_]\s*){3,}\s*$/gm, '')
      // Collapse repeated whitespace while preserving sentence flow
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  async speak(text: string, options?: Partial<UnifiedTTSOptions>): Promise<void> {
    const speechText = this.toSpeechFriendlyText(text);
    if (!speechText) {
      return;
    }

    const fullOptions: UnifiedTTSOptions = {
      text: speechText,
      voice: options?.voice || 'nova',
      speed: options?.speed || 1.0,
      language: options?.language || 'en'
    };

    try {
      const result = await unifiedTTSService.speakText(fullOptions);
      this.lastMethod = result.method;

      if (!result.success) {
        console.warn('⚠️ TTS failed but continuing silently');
      }
    } catch (error) {
      console.error('❌ TTS error:', error);
    }
  }

  stop(): void {
    unifiedTTSService.stopSpeaking();
  }

  isSpeaking(): boolean {
    return unifiedTTSService.isSpeaking();
  }

  getLastMethod(): string {
    return this.lastMethod;
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await unifiedTTSService.initialize();
      this.initialized = true;
      console.log('🎵 Enhanced TTS Service initialized (browser-only)');
    }
  }

  getCapabilities(): {
    openAI: boolean;
    webSpeech: boolean;
    fallback: boolean;
  } {
    const unified = unifiedTTSService.getCapabilities();
    return {
      openAI: false,
      webSpeech: unified.webSpeechAvailable,
      fallback: unified.webSpeechAvailable
    };
  }
}

export const enhancedTTS = EnhancedTTSService.getInstance();
