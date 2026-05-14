import { realTimeProcessingService, RealTimeContext } from './RealTimeProcessingService';

interface ConversationContext {
  userMood: string;
  conversationTone: string;
  topicComplexity: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  environmentalFactors: string[];
  recentInteractions: InteractionEvent[];
  continuousInsights: string[];
}

interface InteractionEvent {
  timestamp: number;
  type: 'voice' | 'visual' | 'gesture' | 'emotion';
  data: any;
  confidence: number;
  processed: boolean;
}

class ContextAwarenessService {
  private context: ConversationContext;
  private eventHistory: InteractionEvent[] = [];
  private maxHistorySize = 100;
  private insights: string[] = [];

  constructor() {
    this.context = {
      userMood: 'neutral',
      conversationTone: 'friendly',
      topicComplexity: 'medium',
      urgency: 'low',
      environmentalFactors: [],
      recentInteractions: [],
      continuousInsights: []
    };

    this.initializeRealTimeSubscriptions();
  }

  private initializeRealTimeSubscriptions() {
    // Subscribe to real-time processing events
    realTimeProcessingService.subscribe('voice_activity_changed', (data) => {
      this.addInteractionEvent('voice', data, data.confidence);
      this.updateConversationTone(data);
    });

    realTimeProcessingService.subscribe('emotion_detected', (data) => {
      this.addInteractionEvent('emotion', data, data.confidence);
      this.updateUserMood(data.emotion);
    });

    realTimeProcessingService.subscribe('visual_context_updated', (data) => {
      this.addInteractionEvent('visual', data, 0.8);
      this.updateEnvironmentalFactors(data);
    });

    realTimeProcessingService.subscribe('context_updated', (data) => {
      this.processRealtimeContext(data);
    });
  }

  private addInteractionEvent(type: InteractionEvent['type'], data: any, confidence: number) {
    const event: InteractionEvent = {
      timestamp: Date.now(),
      type,
      data,
      confidence,
      processed: false
    };

    this.eventHistory.push(event);
    this.context.recentInteractions.push(event);

    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    if (this.context.recentInteractions.length > 20) {
      this.context.recentInteractions.shift();
    }

    // Generate insights from patterns
    this.generateInsights();
  }

  private updateUserMood(emotion: string) {
    const previousMood = this.context.userMood;
    this.context.userMood = emotion;

    // Detect mood transitions
    if (previousMood !== emotion) {
      this.addInsight(`User mood shifted from ${previousMood} to ${emotion}`);
    }
  }

  private updateConversationTone(voiceData: any) {
    if (voiceData.confidence > 0.7) {
      if (voiceData.isActive) {
        this.context.conversationTone = 'engaged';
      } else {
        this.context.conversationTone = 'thoughtful';
      }
    }
  }

  private updateEnvironmentalFactors(visualData: any) {
    const factors = [];
    
    if (visualData.visualContext?.includes('movement')) {
      factors.push('active_environment');
    }
    
    if (visualData.brightness && visualData.brightness < 0.3) {
      factors.push('low_light');
    }
    
    this.context.environmentalFactors = factors;
  }

  private processRealtimeContext(rtContext: RealTimeContext) {
    // Analyze real-time context for patterns
    if (rtContext.voiceActivity && rtContext.speechConfidence > 0.8) {
      this.context.urgency = 'high';
    } else if (rtContext.voiceActivity && rtContext.speechConfidence > 0.5) {
      this.context.urgency = 'medium';
    } else {
      this.context.urgency = 'low';
    }

    // Update topic complexity based on interaction patterns
    const recentComplexInteractions = this.context.recentInteractions
      .filter(event => Date.now() - event.timestamp < 30000) // Last 30 seconds
      .filter(event => event.confidence > 0.7);

    if (recentComplexInteractions.length > 5) {
      this.context.topicComplexity = 'high';
    } else if (recentComplexInteractions.length > 2) {
      this.context.topicComplexity = 'medium';
    } else {
      this.context.topicComplexity = 'low';
    }
  }

  private generateInsights() {
    const recentEvents = this.eventHistory
      .filter(event => Date.now() - event.timestamp < 60000) // Last minute
      .filter(event => event.confidence > 0.6);

    // Pattern: Repeated emotions
    const emotionEvents = recentEvents.filter(e => e.type === 'emotion');
    if (emotionEvents.length >= 3) {
      const dominantEmotion = this.getMostFrequentEmotion(emotionEvents);
      this.addInsight(`User showing consistent ${dominantEmotion} emotion`);
    }

    // Pattern: Voice activity changes
    const voiceEvents = recentEvents.filter(e => e.type === 'voice');
    if (voiceEvents.length >= 4) {
      const isIncreasingActivity = this.isVoiceActivityIncreasing(voiceEvents);
      if (isIncreasingActivity) {
        this.addInsight('User engagement is increasing');
      }
    }

    // Pattern: Visual attention
    const visualEvents = recentEvents.filter(e => e.type === 'visual');
    if (visualEvents.length >= 3) {
      this.addInsight('User is visually engaged with the interface');
    }
  }

  private getMostFrequentEmotion(emotionEvents: InteractionEvent[]): string {
    const emotionCounts = emotionEvents.reduce((acc, event) => {
      const emotion = event.data.emotion || 'neutral';
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';
  }

  private isVoiceActivityIncreasing(voiceEvents: InteractionEvent[]): boolean {
    if (voiceEvents.length < 2) return false;
    
    const sorted = voiceEvents.sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted.slice(0, Math.ceil(sorted.length / 2));
    const second = sorted.slice(Math.ceil(sorted.length / 2));
    
    const firstAvg = first.reduce((sum, e) => sum + e.confidence, 0) / first.length;
    const secondAvg = second.reduce((sum, e) => sum + e.confidence, 0) / second.length;
    
    return secondAvg > firstAvg;
  }

  private addInsight(insight: string) {
    if (!this.insights.includes(insight)) {
      this.insights.push(insight);
      this.context.continuousInsights.push(insight);
      
      // Maintain insights size
      if (this.context.continuousInsights.length > 10) {
        this.context.continuousInsights.shift();
      }
    }
  }

  getContext(): ConversationContext {
    return { ...this.context };
  }

  getRecentInsights(count: number = 5): string[] {
    return this.context.continuousInsights.slice(-count);
  }

  getInteractionHistory(timeWindow: number = 300000): InteractionEvent[] {
    const cutoff = Date.now() - timeWindow; // Default 5 minutes
    return this.eventHistory.filter(event => event.timestamp > cutoff);
  }

  buildContextPrompt(): string {
    const ctx = this.context;
    const recentInsights = this.getRecentInsights(3);
    
    return `
Current user context (real-time analysis):
- User mood: ${ctx.userMood}
- Conversation tone: ${ctx.conversationTone}
- Topic complexity: ${ctx.topicComplexity}
- Urgency level: ${ctx.urgency}
- Environmental factors: ${ctx.environmentalFactors.join(', ')}
- Recent insights: ${recentInsights.join('; ')}
- Active interactions in last minute: ${ctx.recentInteractions.length}

This context is built from continuous audio/visual monitoring and should inform your response appropriately.
    `.trim();
  }

  reset() {
    this.context = {
      userMood: 'neutral',
      conversationTone: 'friendly',
      topicComplexity: 'medium',
      urgency: 'low',
      environmentalFactors: [],
      recentInteractions: [],
      continuousInsights: []
    };
    this.eventHistory = [];
    this.insights = [];
  }
}

export const contextAwarenessService = new ContextAwarenessService();
export type { ConversationContext, InteractionEvent };