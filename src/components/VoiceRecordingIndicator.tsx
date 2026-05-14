import React from 'react';
import { Button } from '@/components/ui/button';
import { Square, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecordingIndicatorProps {
  audioLevel: number;
  transcript?: string;
  onStop: () => void;
  className?: string;
}

export const VoiceRecordingIndicator: React.FC<VoiceRecordingIndicatorProps> = ({
  audioLevel,
  transcript,
  onStop,
  className
}) => {
  // Generate audio bars based on level
  const bars = 5;
  const getBarHeight = (index: number) => {
    const baseHeight = 4;
    const maxHeight = 20;
    const variation = Math.sin((index + Date.now() / 200) * 0.5) * 0.3 + 0.7;
    return baseHeight + (maxHeight - baseHeight) * audioLevel * variation;
  };

  return (
    <div className={cn(
      "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
      "bg-background/95 backdrop-blur-md border border-destructive/50 rounded-2xl shadow-xl",
      "px-4 py-3 flex items-center gap-4 min-w-[280px] max-w-[90vw]",
      "animate-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      {/* Recording indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-destructive rounded-full animate-ping opacity-50" />
        </div>
        <Mic className="h-4 w-4 text-destructive" />
      </div>

      {/* Audio visualizer */}
      <div className="flex items-end gap-0.5 h-6">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-destructive rounded-full transition-all duration-75"
            style={{ height: `${getBarHeight(i)}px` }}
          />
        ))}
      </div>

      {/* Transcript preview */}
      <div className="flex-1 min-w-0">
        {transcript ? (
          <p className="text-sm text-foreground truncate">{transcript}</p>
        ) : (
          <p className="text-sm text-muted-foreground animate-pulse">Listening...</p>
        )}
      </div>

      {/* Stop button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onStop}
        className="rounded-full h-8 px-3 gap-1"
      >
        <Square className="h-3 w-3 fill-current" />
        <span className="hidden sm:inline">Stop</span>
      </Button>
    </div>
  );
};

export default VoiceRecordingIndicator;
