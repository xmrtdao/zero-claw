import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, Keyboard, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileVoiceFallbackProps {
  onSubmit: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MobileVoiceFallback = ({
  onSubmit,
  isProcessing = false,
  disabled = false,
  placeholder = "Type your message here...",
  className = ''
}: MobileVoiceFallbackProps) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = () => {
    const text = inputText.trim();
    if (text) {
      onSubmit(text);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className={cn("p-4 bg-card/50 border-primary/20", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground/80">
          Voice not available? Use text input
        </span>
      </div>
      
      <div className="flex gap-2">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || isProcessing}
          className="flex-1 min-h-[60px] resize-none"
          rows={2}
        />
        
        <Button
          onClick={handleSubmit}
          disabled={disabled || isProcessing || !inputText.trim()}
          size="icon"
          className="self-end h-[60px] w-12"
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <Keyboard className="h-3 w-3" />
        <span>Press Enter to send • Shift+Enter for new line</span>
      </div>
    </Card>
  );
};

export default MobileVoiceFallback;