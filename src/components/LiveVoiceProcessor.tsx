import React, { useRef, useEffect, useState } from 'react';
import { realTimeProcessingService } from '@/services/RealTimeProcessingService';
import { emotionalIntelligenceService } from '@/services/EmotionalIntelligenceService';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveVoiceProcessorProps {
  onTranscriptionUpdate?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string, confidence: number) => void;
  onEmotionDetected?: (emotion: string, confidence: number) => void;
  onVoiceActivityChange?: (isActive: boolean, confidence: number) => void;
  isEnabled?: boolean;
  className?: string;
}

export const LiveVoiceProcessor: React.FC<LiveVoiceProcessorProps> = ({
  onTranscriptionUpdate,
  onFinalTranscript,
  onEmotionDetected,
  onVoiceActivityChange,
  isEnabled = true,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (isEnabled) {
      initializeSpeechRecognition();
    } else {
      stopListening();
    }

    return () => {
      cleanup();
    };
  }, [isEnabled]);

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal && transcript.length > 0) {
          finalTranscript += transcript;
          
          // Analyze emotion from final transcript
          const emotionData = emotionalIntelligenceService.analyzeTextEmotion(transcript);
          onEmotionDetected?.(emotionData.primary, emotionData.confidence);
          
          // Trigger immediate response for complete sentences
          onFinalTranscript?.(transcript, confidence);
          
          // Update real-time processing service
          realTimeProcessingService.updateVoiceActivity(true, confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript + interimTranscript;
      setCurrentTranscript(interimTranscript); // Only show interim for live feedback
      onTranscriptionUpdate?.(fullTranscript);
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Automatically restart if still enabled
      if (isEnabled) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.warn('Could not restart speech recognition:', err);
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
  };

  const startListening = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up audio analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start voice level monitoring
      monitorVoiceLevel();

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Notify real-time processing service
      realTimeProcessingService.updateVoiceActivity(true, 1.0);
      
    } catch (err) {
      setError('Could not access microphone');
      console.error('Microphone access error:', err);
    }
  };

  const stopListening = () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Stop audio monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsListening(false);
    setVoiceLevel(0);
    setCurrentTranscript('');
    
    // Notify real-time processing service
    realTimeProcessingService.updateVoiceActivity(false, 0);
    onVoiceActivityChange?.(false, 0);
  };

  const monitorVoiceLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    setVoiceLevel(normalizedLevel);

    // Detect voice activity
    const isVoiceActive = normalizedLevel > 0.1; // Threshold for voice activity
    onVoiceActivityChange?.(isVoiceActive, normalizedLevel);

    // Update real-time processing with voice activity
    realTimeProcessingService.updateVoiceActivity(isVoiceActive, normalizedLevel);

    animationFrameRef.current = requestAnimationFrame(monitorVoiceLevel);
  };

  const cleanup = () => {
    stopListening();
    
    if (recognitionRef.current) {
      recognitionRef.current = null;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* Control Button */}
      <Button
        variant={isListening ? "destructive" : "default"}
        size="sm"
        onClick={toggleListening}
        disabled={!isEnabled}
        className="w-full"
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Stop Listening
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Start Listening
          </>
        )}
      </Button>

      {/* Voice Level Indicator */}
      {isListening && (
        <div className="w-full max-w-xs">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${voiceLevel * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">
              {Math.round(voiceLevel * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Live Transcript */}
      {currentTranscript && (
        <div className="w-full p-2 bg-secondary/50 rounded text-xs">
          <div className="text-muted-foreground mb-1">Live transcript:</div>
          <div className="text-foreground">{currentTranscript}</div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="w-full p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Status Indicator */}
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <div
          className={`w-2 h-2 rounded-full ${
            isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}
        />
        <span>
          {isListening ? 'Listening...' : 'Not listening'}
        </span>
      </div>
    </div>
  );
};