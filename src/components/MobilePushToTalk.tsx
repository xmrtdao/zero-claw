import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Smartphone, Loader2, AlertCircle, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimplifiedVoiceService } from '@/services/simplifiedVoiceService';
import { mobilePermissionService } from '@/services/mobilePermissionService';
import { MobileVoiceFallback } from './MobileVoiceFallback';

interface MobilePushToTalkProps {
  onTranscript: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
}

export const MobilePushToTalk: React.FC<MobilePushToTalkProps> = ({
  onTranscript,
  isProcessing = false,
  disabled = false,
  className = ''
}) => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'requesting'>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [showFallback, setShowFallback] = useState(false);

  // Initialize permission service and check support
  useEffect(() => {
    const status = mobilePermissionService.getStatus();
    if (!status.isSupported || !SimplifiedVoiceService.isSupported()) {
      setShowFallback(true);
      setError('Voice not supported on this device');
    }
  }, []);

  const requestPermissions = async () => {
    setPermissionStatus('requesting');
    setError(null);

    try {
      const result = await SimplifiedVoiceService.initialize();
      
      if (result.success) {
        setPermissionStatus('granted');
        return true;
      } else {
        setPermissionStatus('denied');
        setError(result.error || 'Permission denied');
        setShowFallback(true);
        return false;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setPermissionStatus('denied');
      setError('Failed to access microphone');
      setShowFallback(true);
      return false;
    }
  };

  const startRecording = async () => {
    if (isRecording || isProcessing || disabled) return;

    // Request permissions if not granted
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    setError(null);
    setTranscript('');

    try {
      const result = await SimplifiedVoiceService.startListening(
        (voiceResult) => {
          setTranscript(voiceResult.text);
          
          if (voiceResult.isFinal) {
            onTranscript(voiceResult.text.trim());
            setTranscript('');
            setIsRecording(false);
          }
        },
        (errorMessage) => {
          setError(errorMessage);
          setIsRecording(false);
        }
      );

      if (result.success) {
        setIsRecording(true);
      } else {
        setError(result.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start voice recording');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    SimplifiedVoiceService.stopListening();
    setIsRecording(false);
  };

  const handleButtonPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getButtonIcon = () => {
    if (permissionStatus === 'requesting') {
      return <Loader2 className="h-6 w-6 animate-spin" />;
    }
    if (isRecording) {
      return <Mic className="h-6 w-6 text-destructive animate-pulse" />;
    }
    if (permissionStatus === 'denied' || error) {
      return <MicOff className="h-6 w-6" />;
    }
    return <Mic className="h-6 w-6" />;
  };

  const getButtonText = () => {
    if (permissionStatus === 'requesting') return 'Setting up...';
    if (isRecording) return 'Release to send';
    if (permissionStatus === 'denied') return 'Permission needed';
    if (permissionStatus === 'unknown') return 'Tap to speak';
    return 'Hold to speak';
  };

  const getStatusBadge = () => {
    const status = mobilePermissionService.getStatus();
    
    if (error) {
      return <Badge variant="destructive" className="text-xs">Error</Badge>;
    }
    if (isRecording) {
      return <Badge variant="default" className="text-xs animate-pulse">Listening</Badge>;
    }
    if (permissionStatus === 'granted') {
      return <Badge variant="default" className="text-xs">Ready</Badge>;
    }
    if (status.isMobile) {
      return <Badge variant="outline" className="text-xs">Mobile</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Tap to enable</Badge>;
  };

  // Show fallback if voice is not supported or permission denied
  if (showFallback) {
    return (
      <MobileVoiceFallback
        onSubmit={onTranscript}
        isProcessing={isProcessing}
        disabled={disabled}
        className={className}
        placeholder="Voice not available - type your message..."
      />
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-card via-card/50 to-secondary/30 border-primary/30 shadow-lg", className)}>
      {/* Enhanced Header */}
      <div className="p-4 border-b border-border bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">🎤 Voice Dictation</h3>
              <p className="text-xs text-muted-foreground">Tap & hold to speak</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Browser instructions */}
      {permissionStatus !== 'granted' && !error && (
        <div className="mb-3 p-2 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            {mobilePermissionService.getBrowserSpecificInstructions().map((instruction, index) => (
              <div key={index}>• {instruction}</div>
            ))}
          </div>
        </div>
      )}

      {/* Main push-to-talk button - Enhanced */}
      <div className="p-6 flex flex-col items-center gap-4">
        <div className="relative">
          <Button
            onClick={handleButtonPress}
            disabled={disabled || isProcessing || permissionStatus === 'requesting'}
            size="lg"
            className={cn(
              "h-20 w-20 rounded-full transition-all duration-300 shadow-lg border-2",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse scale-110 border-red-300 shadow-red-500/30" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground border-primary/50 hover:scale-105 shadow-primary/20"
            )}
          >
            {getButtonIcon()}
          </Button>
          
          {/* Recording indicator ring */}
          {isRecording && (
            <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75"></div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {getButtonText()}
          </div>
          
          {isRecording && (
            <div className="text-xs text-red-600 font-medium animate-pulse bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
              🔴 Listening... Tap again to stop
            </div>
          )}
          
          {transcript && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm max-w-[280px]">
              <div className="font-medium text-xs text-primary mb-1 flex items-center gap-1">
                <Mic className="h-3 w-3" />
                Transcribed:
              </div>
              <div className="text-foreground italic">"{transcript}"</div>
            </div>
          )}
          
          {/* Instructions for mobile users */}
          {!isRecording && permissionStatus === 'granted' && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg max-w-[280px]">
              💡 Tap the microphone to start speaking. Your device will convert speech to text automatically.
            </div>
          )}
        </div>
      </div>

      {/* Fallback option */}
      <div className="px-4 pb-4 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFallback(true)}
          className="w-full text-xs text-muted-foreground hover:text-foreground gap-2"
        >
          <Type className="h-3 w-3" />
          Switch to text input
        </Button>
      </div>
    </Card>
  );
};

export default MobilePushToTalk;