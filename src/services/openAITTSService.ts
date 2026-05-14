import { supabase } from '@/integrations/supabase/client';

export interface OpenAITTSOptions {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

export class OpenAITTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private onSpeechEnd: (() => void) | null = null;

  async speakText(options: OpenAITTSOptions, onSpeechEnd?: () => void): Promise<void> {
    this.onSpeechEnd = onSpeechEnd;
    
    try {
      console.log('🎵 OpenAI TTS - Starting speech synthesis:', {
        textLength: options.text.length,
        voice: options.voice || 'alloy',
        speed: options.speed || 1.0
      });

      // Call our Supabase Edge Function for TTS
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: {
          text: options.text,
          voice: options.voice || 'alloy',
          speed: options.speed || 1.0
        }
      });

      if (error || !data.success) {
        const errorMsg = data?.error || error?.message || 'TTS request failed';
        
        // Check for quota exceeded error - throw specific error for immediate fallback
        if (errorMsg.includes('quota') || errorMsg.includes('insufficient_quota')) {
          throw new Error('QUOTA_EXCEEDED');
        }
        
        throw new Error(errorMsg);
      }

      // Convert base64 audio to blob and play
      const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.onended = () => {
        this.cleanup();
        this.onSpeechEnd?.();
      };
      
      this.currentAudio.onerror = () => {
        console.error('❌ Audio playback error');
        this.cleanup();
        this.onSpeechEnd?.();
      };

      await this.currentAudio.play();
      console.log('✅ OpenAI TTS - Audio playback started');

    } catch (error: any) {
      console.error('❌ OpenAI TTS error:', error);
      this.onSpeechEnd?.();
      throw error;
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private cleanup(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
  }

  stopSpeaking(): void {
    if (this.currentAudio) {
      this.cleanup();
      this.onSpeechEnd?.();
      console.log('🛑 OpenAI TTS - Speech stopped');
    }
  }

  isSpeaking(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  static async create(): Promise<OpenAITTSService> {
    return new OpenAITTSService();
  }
}