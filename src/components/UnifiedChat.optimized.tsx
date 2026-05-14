/**
 * Optimized UnifiedChat Component
 * 
 * Key optimizations:
 * - Uses consolidated services (TTS, AI, Memory)
 * - Lazy loads heavy features
 * - Reduced bundle size
 * - Improved initial render performance
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatTime } from '@/utils/dateFormatter';
import { Send, Volume2, VolumeX, Trash2, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Consolidated services (much smaller bundle)
import { consolidatedTTS } from '@/services/consolidatedTTSService';
import { consolidatedAI } from '@/services/consolidatedAIService';
import { consolidatedMemory } from '@/services/consolidatedMemoryService';
import { unifiedDataService, type MiningStats } from '@/services/unifiedDataService';
import { conversationPersistence } from '@/services/conversationPersistenceService';

// Lazy load optional features
const GitHubPATInput = lazy(() => import('./GitHubContributorRegistration').then(m => ({ default: m.GitHubPATInput })));
const GitHubTokenStatus = lazy(() => import('./GitHubTokenStatus').then(m => ({ default: m.GitHubTokenStatus })));

interface UnifiedMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  emotion?: string;
  confidence?: number;
}

interface UnifiedChatProps {
  className?: string;
  miningStats?: MiningStats;
}

const UnifiedChatOptimized: React.FC<UnifiedChatProps> = ({
  className = '',
  miningStats: externalMiningStats
}) => {
  // Core state
  const { language } = useLanguage();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  
  // Voice/TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => 
    localStorage.getItem('audioEnabled') === 'true'
  );
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Context state
  const [miningStats, setMiningStats] = useState<MiningStats | null>(externalMiningStats || null);
  const [currentProvider, setCurrentProvider] = useState<string>('');
  
  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = useRef<string>('');
  const hasInitializedConversation = useRef(false);

  // Initialize user ID
  useEffect(() => {
    const initUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        userId.current = user.id;
        return;
      }

      const userCtx = await unifiedDataService.getUserContext();
      userId.current = userCtx.ip || `anonymous-${crypto.randomUUID()}`;
    };
    initUserId();
  }, []);

  // Enable audio
  const handleEnableAudio = async () => {
    try {
      await consolidatedTTS.initialize();
      setAudioInitialized(true);
      setVoiceEnabled(true);
      localStorage.setItem('audioEnabled', 'true');
      setCurrentProvider(consolidatedTTS.getCurrentProvider());
      console.log('✅ Audio enabled with', consolidatedTTS.getCurrentProvider());
    } catch (error) {
      console.error('Failed to enable audio:', error);
    }
  };

  // Auto-enable if previously enabled
  useEffect(() => {
    if (localStorage.getItem('audioEnabled') === 'true') {
      handleEnableAudio();
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0 && !isProcessing) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isProcessing]);

  // Initialize conversation persistence
  useEffect(() => {
    const initialize = async () => {
      if (hasInitializedConversation.current) return;
      hasInitializedConversation.current = true;

      try {
        // Load mining stats if not provided
        if (!externalMiningStats) {
          const stats = await unifiedDataService.getMiningStats();
          setMiningStats(stats);
        }

        // Initialize conversation
        await conversationPersistence.initializeSession();
        
        // Load recent messages
        const context = await conversationPersistence.getConversationContext(5);
        if (context.recentMessages.length > 0) {
          setMessages(context.recentMessages.map(msg => ({
            id: String(msg.id || Date.now()),
            content: msg.content,
            sender: msg.sender as 'user' | 'assistant',
            timestamp: msg.timestamp
          })));
        } else {
          // Show welcome message
          addAssistantMessage("Hello! I'm your XMRT AI assistant. How can I help you today?");
        }
      } catch (error) {
        console.error('Initialization error:', error);
        addAssistantMessage("Hello! I'm your XMRT AI assistant. How can I help you today?");
      }
    };

    initialize();
  }, []);

  // Add assistant message
  const addAssistantMessage = (content: string) => {
    const message: UnifiedMessage = {
      id: Date.now().toString(),
      content,
      sender: 'assistant',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    
    // Store in memory
    consolidatedMemory.storeMemory(userId.current, content, {
      sender: 'assistant',
      timestamp: new Date()
    });

    // Speak if voice enabled
    if (voiceEnabled && audioInitialized) {
      setIsSpeaking(true);
      consolidatedTTS.speak(content)
        .catch(err => console.error('TTS error:', err))
        .finally(() => setIsSpeaking(false));
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!textInput.trim() || isProcessing) return;

    const userMessage: UnifiedMessage = {
      id: Date.now().toString(),
      content: textInput,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);

    try {
      // Store user message in memory
      await consolidatedMemory.storeMemory(userId.current, textInput, {
        sender: 'user',
        timestamp: new Date()
      });

      // Build context
      const context = await consolidatedMemory.buildContext(userId.current, textInput);
      
      // Prepare messages for AI
      const aiMessages = messages.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      aiMessages.push({
        role: 'user',
        content: textInput
      });

      // Add system context
      const systemPrompt = `You are Eliza, the XMRT AI assistant. 
Context: ${JSON.stringify({
  topics: context.topics,
  sentiment: context.sentiment,
  miningStats: miningStats ? {
    hashRate: miningStats.hashRate,
    totalHashes: miningStats.totalHashes,
    validShares: miningStats.validShares
  } : null
})}

Be helpful, concise, and knowledgeable about cryptocurrency mining and the XMRT ecosystem.`;

      // Get AI response
      const response = await consolidatedAI.chat(aiMessages, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1024
      });

      setCurrentProvider(consolidatedAI.getCurrentProvider());
      addAssistantMessage(response);

      // Save to persistence
      await consolidatedMemory.storeMemory(userId.current, userMessage.content, {
        sender: 'user',
        timestamp: userMessage.timestamp
      });

      await consolidatedMemory.storeMemory(userId.current, response, {
        sender: 'assistant',
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Chat error:', error);
      addAssistantMessage("I apologize, but I'm having trouble processing your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear conversation
  const handleClearConversation = async () => {
    setMessages([]);
    consolidatedMemory.clearCache(userId.current);
    addAssistantMessage("Conversation cleared. How can I help you?");
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <AdaptiveAvatar 
            size="sm"
          />
          <div>
            <h3 className="font-semibold text-foreground">Eliza AI Assistant</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wifi className={`h-3 w-3 ${isConnected ? 'text-mining-active' : 'text-mining-error'}`} />
              <span>{currentProvider || 'Initializing...'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (voiceEnabled) {
                setVoiceEnabled(false);
                localStorage.setItem('audioEnabled', 'false');
                consolidatedTTS.stop();
              } else {
                handleEnableAudio();
              }
            }}
            className="h-8 w-8 p-0"
          >
            {voiceEnabled ? (
              <Volume2 className={`h-4 w-4 ${isSpeaking ? 'text-mining-active animate-pulse' : ''}`} />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          
          {/* Clear button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearConversation}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isProcessing}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isProcessing || !textInput.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stats */}
        {miningStats && (
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>Hashrate: {miningStats.hashRate || 0} H/s</span>
            <span>Valid Shares: {miningStats.validShares || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Export with lazy loading wrapper
export default UnifiedChatOptimized;
