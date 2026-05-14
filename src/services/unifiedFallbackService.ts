import { ElevenLabsService } from './elevenlabsService';
import { UnifiedElizaService } from './unifiedElizaService';
import { FallbackTTSService } from './fallbackTTSService';
import { FallbackAIService } from './fallbackAIService';
import { FallbackSpeechService } from './fallbackSpeechService';
import { GeminiTTSService } from './geminiTTSService';
import type { MiningStats } from './unifiedDataService';

export interface UnifiedServiceOptions {
  elevenLabsApiKey?: string;
  geminiApiKey?: string;
  enableLocalFallbacks?: boolean;
}

export interface ServiceStatus {
  elevenlabs: 'available' | 'unavailable' | 'loading';
  gemini: 'available' | 'unavailable' | 'loading';
  webSpeech: 'available' | 'unavailable' | 'loading';
  localModels: 'available' | 'unavailable' | 'loading';
}

export class UnifiedFallbackService {
  private elevenLabsService: ElevenLabsService | null = null;
  private geminiTTSService: GeminiTTSService | null = null;
  private options: UnifiedServiceOptions;
  private serviceStatus: ServiceStatus = {
    elevenlabs: 'loading',
    gemini: 'loading',
    webSpeech: 'loading',
    localModels: 'loading'
  };

  constructor(options: UnifiedServiceOptions = {}) {
    this.options = options;
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    // Initialize ElevenLabs if API key provided
    if (this.options.elevenLabsApiKey) {
      try {
        this.elevenLabsService = new ElevenLabsService(this.options.elevenLabsApiKey);
        this.serviceStatus.elevenlabs = 'available';
        console.log('ElevenLabs service initialized');
      } catch (error) {
        console.error('ElevenLabs initialization failed:', error);
        this.serviceStatus.elevenlabs = 'unavailable';
      }
    } else {
      this.serviceStatus.elevenlabs = 'unavailable';
    }

    // Initialize Gemini TTS if API key provided
    if (this.options.geminiApiKey) {
      try {
        this.geminiTTSService = await GeminiTTSService.create();
        console.log('Gemini TTS service initialized');
      } catch (error) {
        console.error('Gemini TTS initialization failed:', error);
      }
    }

    // Test Web Speech API availability
    this.serviceStatus.webSpeech = ('speechSynthesis' in window && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) 
      ? 'available' : 'unavailable';

    // Test Gemini availability (simplified check)
    this.serviceStatus.gemini = this.options.geminiApiKey ? 'available' : 'unavailable';

    console.log('Service status:', this.serviceStatus);
  }

  // Text-to-Speech with fallback chain
  async speakText(text: string, voiceId?: string): Promise<{ success: boolean; method: string }> {
    const methods = [];

    // Primary: ElevenLabs (high quality)
    if (this.elevenLabsService && this.serviceStatus.elevenlabs === 'available') {
      methods.push({
        name: 'ElevenLabs',
        fn: () => this.elevenLabsService!.speakText(text, voiceId)
      });
    }

    // Fallback 1: Gemini TTS (enhanced Web Speech)
    if (this.geminiTTSService && this.serviceStatus.gemini === 'available') {
      methods.push({
        name: 'Gemini TTS',
        fn: () => this.geminiTTSService!.speakText({ text, voiceId })
      });
    }

    // Fallback 2: Local TTS (Web Speech + Local models)
    methods.push({
      name: 'Fallback TTS',
      fn: async () => {
        const result = await FallbackTTSService.speak({ text, voiceId });
        return result;
      }
    });

    for (const method of methods) {
      try {
        console.log(`Attempting TTS with: ${method.name}`);
        await method.fn();
        console.log(`TTS successful with: ${method.name}`);
        return { success: true, method: method.name };
      } catch (error) {
        console.warn(`${method.name} TTS failed:`, error);
        continue;
      }
    }

    return { success: false, method: 'none' };
  }

  // AI Response Generation with fallback chain
  async generateResponse(
    userInput: string, 
    context: { miningStats?: MiningStats; userContext?: any } = {}
  ): Promise<{ text: string; method: string; confidence: number }> {
    const methods = [];

    // Primary: ElevenLabs Conversational AI
    if (this.elevenLabsService && this.serviceStatus.elevenlabs === 'available') {
      methods.push({
        name: 'ElevenLabs AI',
        fn: () => this.elevenLabsService!.generateResponse(userInput, context)
      });
    }

    // Tertiary: Gemini AI via UnifiedElizaService
    if (this.serviceStatus.gemini === 'available') {
      methods.push({
        name: 'Gemini AI',
        fn: async () => {
          const response = await UnifiedElizaService.generateResponse(userInput, context);
          return { text: response, method: 'Gemini AI', confidence: 0.9 };
        }
      });
    }

    // Final Fallback: Enhanced Local AI
    methods.push({
      name: 'Enhanced Local AI',
      fn: () => FallbackAIService.generateResponse(userInput, context)
    });

    for (const method of methods) {
      try {
        console.log(`Attempting AI response with: ${method.name}`);
        const result = await method.fn();
        console.log(`AI response successful with: ${method.name}`);
        return result;
      } catch (error) {
        console.warn(`${method.name} AI failed:`, error);
        continue;
      }
    }

    return {
      text: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.',
      method: 'error fallback',
      confidence: 0.1
    };
  }

  // Speech Recognition with fallback chain
  async recognizeSpeech(audioBlob?: Blob): Promise<{ text: string; confidence: number; method: string }> {
    try {
      const result = await FallbackSpeechService.recognize(audioBlob);
      return result;
    } catch (error) {
      console.error('All speech recognition methods failed:', error);
      return {
        text: '',
        confidence: 0,
        method: 'failed'
      };
    }
  }

  // Get current service status
  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  // Update service options
  updateOptions(newOptions: Partial<UnifiedServiceOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.initializeServices();
  }

  // Test all services
  async testAllServices(): Promise<ServiceStatus> {
    // Test ElevenLabs
    if (this.elevenLabsService) {
      try {
        await this.elevenLabsService.textToSpeech('test', undefined, 'eleven_turbo_v2');
        this.serviceStatus.elevenlabs = 'available';
      } catch (error) {
        this.serviceStatus.elevenlabs = 'unavailable';
      }
    }

    // Test local models (lightweight test)
    try {
      this.serviceStatus.localModels = 'loading';
      await FallbackTTSService.speak({ text: 'test' });
      this.serviceStatus.localModels = 'available';
    } catch (error) {
      this.serviceStatus.localModels = 'unavailable';
    }

    return this.serviceStatus;
  }
}

// Export singleton instance
export const unifiedFallbackService = new UnifiedFallbackService({
  elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  enableLocalFallbacks: true
});