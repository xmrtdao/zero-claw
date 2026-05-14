import { supabase } from '@/integrations/supabase/client';
import { quickGreetingService } from './quickGreetingService';
import { enhancedMemoryService } from './enhancedMemoryService';

export interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationSession {
  id: string;
  sessionKey: string;
  title?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class ConversationPersistenceService {
  private static instance: ConversationPersistenceService;
  private currentSessionId: string | null = null;
  private currentSessionKey: string | null = null;
  private currentUserId: string | null = null;
  private currentUserEmail: string | null = null;

  public static getInstance(): ConversationPersistenceService {
    if (!ConversationPersistenceService.instance) {
      ConversationPersistenceService.instance =
        new ConversationPersistenceService();
    }
    return ConversationPersistenceService.instance;
  }

  private isValidUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    );
  }

  private formatHashAsUuid(bytes: Uint8Array): string {
    const uuidBytes = bytes.slice(0, 16);
    uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x40;
    uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80;

    const hex = Array.from(uuidBytes, (b) =>
      b.toString(16).padStart(2, '0')
    ).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private async sessionIdToUUID(sessionId: string): Promise<string> {
    const normalized = sessionId.trim().toLowerCase();
    const payload = new TextEncoder().encode(
      `conversation-access:${normalized}`
    );
    const digest = await crypto.subtle.digest('SHA-256', payload);
    return this.formatHashAsUuid(new Uint8Array(digest));
  }

  private async normalizeSessionIdForDb(sessionId: string): Promise<string> {
    if (this.isValidUUID(sessionId)) {
      return sessionId;
    }

    return this.sessionIdToUUID(sessionId);
  }

  private getAnonymousSessionKey(): string {
    const storageKey = 'xmrt-anon-session-key';
    const existingKey = localStorage.getItem(storageKey);
    if (existingKey && existingKey.trim()) {
      return existingKey;
    }

    const newKey = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(storageKey, newKey);
    return newKey;
  }

  private async resolveAuthContext(): Promise<{
    userId: string | null;
    userEmail: string | null;
    sessionKey: string;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        this.currentUserId = user.id;
        this.currentUserEmail = user.email || null;
        this.currentSessionKey = `user-${user.id}`;
        return {
          userId: user.id,
          userEmail: user.email || null,
          sessionKey: this.currentSessionKey,
        };
      }
    } catch (error) {
      console.warn('Failed to resolve authenticated user, falling back to anonymous session:', error);
    }

    this.currentUserId = null;
    this.currentUserEmail = null;
    this.currentSessionKey = this.getAnonymousSessionKey();
    return {
      userId: null,
      userEmail: null,
      sessionKey: this.currentSessionKey,
    };
  }

  // Initialize or resume session for current authenticated user (fallback: anonymous local session)
  public async initializeSession(): Promise<string> {
    const { userId, userEmail, sessionKey } = await this.resolveAuthContext();

    try {
      // Use secure edge function to get session
      const { data, error } = await supabase.functions.invoke(
        'conversation-access',
        {
          body: {
            action: 'get_session',
            sessionKey,
            userId,
            userEmail,
          },
        }
      );

      if (error) {
        console.error('Error fetching session:', error);
        throw error;
      }

      if (data.session) {
        // Resume existing session
        this.currentSessionId = data.session.id;
        this.currentSessionKey = data.session.session_key || sessionKey;
        console.log(
          `Resumed session ${this.currentSessionId} for ${userId ? `user ${userId}` : `anonymous key ${sessionKey}`}`
        );
        return this.currentSessionId;
      }

      // Create new session using service role via edge function
      const { data: createData, error: createError } =
        await supabase.functions.invoke('conversation-access', {
          body: {
            action: 'create_session',
            sessionKey,
            sessionData: {
              session_key: sessionKey,
              title: `Conversation - ${new Date().toLocaleDateString()}`,
              is_active: true,
              user_profile_id: userId,
              metadata: {
                sessionType: userId ? 'authenticated' : 'anonymous',
                userId,
                userEmail,
                startedAt: new Date().toISOString(),
                platform: navigator.userAgent.includes('Mobile')
                  ? 'mobile'
                  : 'desktop',
              },
            },
            userId,
            userEmail,
          },
        });

      if (createError || !createData.success) {
        console.error('Error creating session:', createError);
        throw createError;
      }

      this.currentSessionId = createData.session.id;
      this.currentSessionKey = createData.session.session_key || sessionKey;
      console.log(
        `Created new session ${this.currentSessionId} for ${userId ? `user ${userId}` : `anonymous key ${sessionKey}`}`
      );
      return this.currentSessionId;
    } catch (error) {
      console.error('Failed to initialize session:', error);
      // Fallback to deterministic UUID derived from local session identifier
      this.currentSessionId = await this.sessionIdToUUID(
        `local-${sessionKey}-${Date.now()}`
      );
      return this.currentSessionId;
    }
  }

  // Store a message in the conversation
  public async storeMessage(
    content: string,
    sender: 'user' | 'assistant',
    metadata?: Record<string, any>
  ): Promise<void> {
    const normalizedContent = typeof content === 'string' ? content.trim() : '';
    if (!normalizedContent) {
      console.warn('Skipping message persistence due to empty content');
      return;
    }

    if (!this.currentSessionId) {
      await this.initializeSession();
    }

    const { userId, userEmail, sessionKey } = await this.resolveAuthContext();

    try {
      // Use secure edge function to store message
      const { data, error } = await supabase.functions.invoke(
        'conversation-access',
        {
          body: {
            action: 'add_message',
            sessionKey,
            userId,
            userEmail,
            sessionId: this.currentSessionId,
            session_id: this.currentSessionId,
            message_type: sender,
            content: normalizedContent,
            messageData: {
              content: normalizedContent,
              message_type: sender,
              metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                userId,
                userEmail,
              },
            },
          },
        }
      );

      if (error || !data.success) {
        console.error('Error storing message:', error);
        return;
      }

      const currentMessageCount = await this.getMessageCount();

      // Update session timestamp using secure edge function
      await supabase.functions.invoke('conversation-access', {
        body: {
          action: 'update_session',
          sessionKey,
          userId,
          userEmail,
          sessionId: this.currentSessionId,
          session_id: this.currentSessionId,
          messageData: {
            updated_at: new Date().toISOString(),
            metadata: {
              lastActivity: new Date().toISOString(),
              messageCount: currentMessageCount,
            },
          },
        },
      });

      // Store important messages in enhanced memory
      if (
        sender === 'user' ||
        (sender === 'assistant' && normalizedContent.length > 100)
      ) {
        const importanceScore = sender === 'user' ? 0.7 : 0.6;
        await enhancedMemoryService.storeMemory(
          userId || sessionKey,
          this.currentSessionId!,
          normalizedContent,
          sender === 'user' ? 'user_query' : 'assistant_response',
          importanceScore,
          metadata
        );
      }

      // Check if summarization is needed (every 15 messages)
      if (currentMessageCount > 0 && currentMessageCount % 15 === 0) {
        try {
          await this.createConversationSummary();
        } catch (error) {
          console.error('Failed to create conversation summary:', error);
        }
      }
    } catch (error) {
      console.error('Failed to store message:', error);
    }
  }

  // Create conversation summary for the current batch of messages
  private async createConversationSummary(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      // Import summarization service dynamically to avoid circular imports
      const { conversationSummarization } =
        await import('./conversationSummarizationService');

      // Get the latest 15 messages for summarization
      const recentMessages = await this.getRecentConversationHistory(15);

      if (recentMessages.length === 0) return;

      // Generate summary
      const summaryText =
        await conversationSummarization.generateSummary(recentMessages);

      // Store the summary
      await conversationSummarization.storeSummary(
        this.currentSessionId,
        summaryText,
        recentMessages.length,
        recentMessages[0]?.id,
        recentMessages[recentMessages.length - 1]?.id,
        {
          generatedAt: new Date().toISOString(),
          messageRange: {
            start: recentMessages[0]?.timestamp,
            end: recentMessages[recentMessages.length - 1]?.timestamp,
          },
        }
      );

      console.log(
        `Created conversation summary for ${recentMessages.length} messages`
      );
    } catch (error) {
      console.error('Failed to create conversation summary:', error);
    }
  }

  // Get recent conversation history (lazy loading - only recent messages)
  public async getRecentConversationHistory(
    limit: number = 200
  ): Promise<ConversationMessage[]> {
    if (!this.currentSessionId) {
      await this.initializeSession();
    }

    if (!this.currentSessionId) {
      return [];
    }

    const { userId, userEmail, sessionKey } = await this.resolveAuthContext();

    try {
      // Use secure edge function to get messages
      const { data, error } = await supabase.functions.invoke(
        'conversation-access',
        {
          body: {
            action: 'get_messages',
            sessionKey,
            userId,
            userEmail,
            sessionId: this.currentSessionId,
            session_id: this.currentSessionId,
            limit,
            offset: 0,
          },
        }
      );

      if (error || !data.success) {
        console.error('Error fetching recent conversation history:', error);
        return [];
      }

      const messages = data.messages;

      // Reverse to maintain chronological order (oldest first)
      const chronologicalMessages = messages?.reverse() || [];

      return chronologicalMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.message_type as 'user' | 'assistant',
        timestamp: new Date(msg.timestamp),
        metadata: (msg.metadata as Record<string, any>) || {},
      }));
    } catch (error) {
      console.error('Failed to get recent conversation history:', error);
      return [];
    }
  }

  // Get conversation history with pagination support
  public async getConversationHistory(
    limit: number = 500,
    offset: number = 0
  ): Promise<ConversationMessage[]> {
    if (!this.currentSessionId) {
      await this.initializeSession();
    }

    if (!this.currentSessionId) {
      return [];
    }

    const { userId, userEmail, sessionKey } = await this.resolveAuthContext();

    try {
      // Use secure edge function
      const { data, error } = await supabase.functions.invoke(
        'conversation-access',
        {
          body: {
            action: 'get_messages',
            sessionKey,
            userId,
            userEmail,
            sessionId: this.currentSessionId,
            session_id: this.currentSessionId,
            limit,
            offset,
          },
        }
      );

      if (error || !data.success) {
        console.error('Error fetching conversation history:', error);
        return [];
      }

      const messages = data.messages;

      // Reverse to maintain chronological order (oldest first)
      const chronologicalMessages = messages?.reverse() || [];

      return chronologicalMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.message_type as 'user' | 'assistant',
        timestamp: new Date(msg.timestamp),
        metadata: (msg.metadata as Record<string, any>) || {},
      }));
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  // Load more messages for pagination
  public async loadMoreMessages(
    currentMessageCount: number,
    limit: number = 200
  ): Promise<ConversationMessage[]> {
    return this.getConversationHistory(limit, currentMessageCount);
  }

  // Get conversation context (summaries + recent messages) for optimized loading
  public async getConversationContext(
    recentMessageLimit: number = 200
  ): Promise<{
    summaries: Array<{
      summaryText: string;
      messageCount: number;
      createdAt: Date;
    }>;
    recentMessages: ConversationMessage[];
    totalMessageCount: number;
    hasMoreMessages: boolean;
  }> {
    if (!this.currentSessionId) {
      await this.initializeSession();
    }

    if (!this.currentSessionId) {
      return {
        summaries: [],
        recentMessages: [],
        totalMessageCount: 0,
        hasMoreMessages: false,
      };
    }

    const { userId, userEmail, sessionKey } = await this.resolveAuthContext();

    try {
      // Get conversation summaries using secure edge function
      const { data: summariesData, error: summariesError } =
        await supabase.functions.invoke('conversation-access', {
          body: {
            action: 'get_summaries',
            sessionKey,
            userId,
            userEmail,
            sessionId: this.currentSessionId,
            session_id: this.currentSessionId,
          },
        });

      if (summariesError || !summariesData.success) {
        console.error('Error fetching summaries:', summariesError);
      }

      const summaries = summariesData?.summaries || [];

      // Get recent messages
      const recentMessages =
        await this.getRecentConversationHistory(recentMessageLimit);

      // Get total message count
      const totalMessageCount = await this.getMessageCount();

      const hasMoreMessages = totalMessageCount > recentMessageLimit;

      return {
        summaries:
          summaries?.map((s) => ({
            summaryText: s.summary_text,
            messageCount: s.message_count,
            createdAt: new Date(s.created_at),
          })) || [],
        recentMessages,
        totalMessageCount,
        hasMoreMessages,
      };
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return {
        summaries: [],
        recentMessages: [],
        totalMessageCount: 0,
        hasMoreMessages: false,
      };
    }
  }

  // Get message count for current session
  public async getMessageCount(): Promise<number> {
    if (!this.currentSessionId) return 0;

    try {
      const dbSessionId = await this.normalizeSessionIdForDb(
        this.currentSessionId
      );
      const { count, error } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', dbSessionId);

      if (error) {
        console.error('Error getting message count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get message count:', error);
      return 0;
    }
  }

  // Store interaction patterns for learning
  public async storeInteractionPattern(
    patternName: string,
    patternData: Record<string, any>,
    confidenceScore: number = 0.5
  ): Promise<void> {
    try {
      const { userId, sessionKey } = await this.resolveAuthContext();

      // Check if pattern exists
      const { data: existing, error: fetchError } = await supabase
        .from('interaction_patterns')
        .select('*')
        .eq('session_key', sessionKey)
        .eq('pattern_name', patternName)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing pattern:', fetchError);
        return;
      }

      if (existing) {
        // Update existing pattern
        await supabase
          .from('interaction_patterns')
          .update({
            pattern_data: patternData,
            frequency: existing.frequency + 1,
            last_occurrence: new Date().toISOString(),
            confidence_score: Math.min(existing.confidence_score + 0.1, 1.0),
          })
          .eq('id', existing.id);
      } else {
        // Create new pattern
        await supabase.from('interaction_patterns').insert({
          session_key: sessionKey,
          pattern_name: patternName,
          pattern_data: patternData,
          frequency: 1,
          confidence_score: confidenceScore,
          metadata: {
            firstSeen: new Date().toISOString(),
            userId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to store interaction pattern:', error);
    }
  }

  // Get user preferences
  public async getUserPreferences(): Promise<Record<string, any>> {
    try {
      const { sessionKey } = await this.resolveAuthContext();

      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('session_key', sessionKey);

      if (error) {
        console.error('Error fetching preferences:', error);
        return {};
      }

      return (
        preferences?.reduce(
          (acc, pref) => {
            acc[pref.preference_key] = pref.preference_value;
            return acc;
          },
          {} as Record<string, any>
        ) || {}
      );
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return {};
    }
  }

  // Update user preference
  public async updateUserPreference(key: string, value: any): Promise<void> {
    try {
      const { sessionKey } = await this.resolveAuthContext();

      const { error } = await supabase.from('user_preferences').upsert(
        {
          session_key: sessionKey,
          preference_key: key,
          preference_value: value,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_key,preference_key',
        }
      );

      if (error) {
        console.error('Error updating preference:', error);
      }
    } catch (error) {
      console.error('Failed to update user preference:', error);
    }
  }

  // Clear conversation history for current session
  public async clearConversationHistory(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      // Delete all messages for current session
      await supabase
        .from('conversation_messages')
        .delete()
        .eq('session_id', this.currentSessionId);

      // Delete all summaries for current session
      await supabase
        .from('conversation_summaries')
        .delete()
        .eq('session_id', this.currentSessionId);

      // Clear localStorage cache
      localStorage.removeItem('xmrt-conversation-summary');
      localStorage.removeItem('xmrt-last-summary-time');

      console.log('✅ Conversation history cleared successfully');
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      throw error;
    }
  }

  // Get comprehensive conversation context for AI (better context recall)
  public async getFullConversationContext(): Promise<{
    summaries: Array<{
      summaryText: string;
      messageCount: number;
      createdAt: Date;
    }>;
    recentMessages: ConversationMessage[];
    userPreferences: Record<string, any>;
    interactionPatterns: Array<{
      patternName: string;
      frequency: number;
      confidence: number;
    }>;
    totalMessageCount: number;
    sessionStartedAt: Date | null;
  }> {
    if (!this.currentSessionId) {
      return {
        summaries: [],
        recentMessages: [],
        userPreferences: {},
        interactionPatterns: [],
        totalMessageCount: 0,
        sessionStartedAt: null,
      };
    }

    try {
      const [
        summaries,
        recentMessages,
        userPreferences,
        interactionPatterns,
        sessionInfo,
      ] = await Promise.all([
        // Get all conversation summaries
        supabase
          .from('conversation_summaries')
          .select('summary_text, message_count, created_at')
          .eq('session_id', this.currentSessionId)
          .order('created_at', { ascending: true }),

        // Get recent 20 messages for immediate context
        this.getRecentConversationHistory(20),

        // Get user preferences
        this.getUserPreferences(),

        // Get interaction patterns
        supabase
          .from('interaction_patterns')
          .select('pattern_name, frequency, confidence_score')
          .eq('session_key', (await this.resolveAuthContext()).sessionKey)
          .order('last_occurrence', { ascending: false })
          .limit(10),

        // Get session info
        supabase
          .from('conversation_sessions')
          .select('created_at')
          .eq('id', this.currentSessionId)
          .single(),
      ]);

      const totalMessageCount = await this.getMessageCount();

      return {
        summaries:
          summaries.data?.map((s) => ({
            summaryText: s.summary_text,
            messageCount: s.message_count,
            createdAt: new Date(s.created_at),
          })) || [],
        recentMessages,
        userPreferences,
        interactionPatterns:
          interactionPatterns.data?.map((p) => ({
            patternName: p.pattern_name,
            frequency: p.frequency,
            confidence: p.confidence_score,
          })) || [],
        totalMessageCount,
        sessionStartedAt: sessionInfo.data
          ? new Date(sessionInfo.data.created_at)
          : null,
      };
    } catch (error) {
      console.error('Failed to get full conversation context:', error);
      return {
        summaries: [],
        recentMessages: [],
        userPreferences: {},
        interactionPatterns: [],
        totalMessageCount: 0,
        sessionStartedAt: null,
      };
    }
  }

  // Close current session
  public async closeSession(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      await supabase
        .from('conversation_sessions')
        .update({
          is_active: false,
          metadata: {
            closedAt: new Date().toISOString(),
          },
        })
        .eq('id', this.currentSessionId);

      this.currentSessionId = null;
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  }
}

export const conversationPersistence =
  ConversationPersistenceService.getInstance();
