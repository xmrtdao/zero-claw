import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  method: string;
}

export class FallbackSpeechService {
  private static whisperPipeline: any = null;
  private static isInitializing = false;

  // Initialize local Whisper model
  private static async initializeWhisper(): Promise<void> {
    if (this.whisperPipeline || this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      console.log('Initializing local Whisper model...');
      try {
        this.whisperPipeline = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-tiny.en',
          { device: 'webgpu' }
        );
      } catch (webgpuError) {
        console.warn('WebGPU Whisper failed, trying CPU:', webgpuError);
        this.whisperPipeline = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-tiny.en',
          { device: 'cpu' }
        );
      }
      console.log('Local Whisper model initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize local Whisper model:', error);
      this.whisperPipeline = null;
    } finally {
      this.isInitializing = false;
    }
  }

  // Web Speech API recognition
  static recognizeWithWebSpeech(): Promise<SpeechRecognitionResult> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const result = event.results[0];
        resolve({
          text: result[0].transcript,
          confidence: result[0].confidence || 0.8,
          method: 'Web Speech API'
        });
      };

      recognition.onerror = (error) => reject(error);
      recognition.onend = () => {
        // Handle case where no speech was detected
        setTimeout(() => {
          reject(new Error('No speech detected'));
        }, 100);
      };

      recognition.start();
    });
  }

  // Local Whisper model recognition
  static async recognizeWithWhisper(audioBlob: Blob): Promise<SpeechRecognitionResult> {
    try {
      await this.initializeWhisper();
      
      if (!this.whisperPipeline) {
        throw new Error('Local Whisper model not available');
      }

      console.log('Transcribing with local Whisper model...');
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const result = await this.whisperPipeline(arrayBuffer);
      
      return {
        text: result.text || '',
        confidence: 0.7, // Whisper doesn't provide confidence scores
        method: 'Local Whisper'
      };
    } catch (error) {
      console.error('Local Whisper failed:', error);
      throw error;
    }
  }

  // Record audio for local processing
  static async recordAudio(duration: number = 5000): Promise<Blob> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());
        resolve(audioBlob);
      };

      mediaRecorder.onerror = reject;

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, duration);
    });
  }

  // Unified speech recognition with fallback chain
  static async recognize(audioBlob?: Blob): Promise<SpeechRecognitionResult> {
    const methods = [
      { 
        name: 'Web Speech API', 
        fn: () => this.recognizeWithWebSpeech()
      }
    ];

    // Add local Whisper if audio blob is provided
    if (audioBlob) {
      methods.push({
        name: 'Local Whisper',
        fn: () => this.recognizeWithWhisper(audioBlob)
      });
    }

    for (const method of methods) {
      try {
        console.log(`Attempting speech recognition with: ${method.name}`);
        const result = await method.fn();
        console.log(`Speech recognition successful with: ${method.name}`);
        return result;
      } catch (error) {
        console.warn(`${method.name} failed:`, error);
        continue;
      }
    }

    throw new Error('All speech recognition fallback methods failed');
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}