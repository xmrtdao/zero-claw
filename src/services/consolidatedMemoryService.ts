/**
 * Consolidated Memory & Context Service
 * Merges: enhancedMemoryService, memoryContextService, contextManager,
 * ContextAwarenessService, memoryVectorizationWorker
 * 
 * Provides unified memory management with semantic search and context awareness
 */

import { supabase } from '@/integrations/supabase/client';

interface MemoryEntry {
  id?: string;
  content: string;
  context: Record<string, any>;
  timestamp: Date;
  importance: number; // 0-1
  embedding?: number[];
  userId?: string;
}

interface ContextData {
  userPreferences: Record<string, any>;
  conversationHistory: string[];
  entities: Map<string, any>;
  topics: string[];
  sentiment: number;
}

class ConsolidatedMemoryService {
  private memoryCache: Map<string, MemoryEntry[]> = new Map();
  private contextCache: Map<string, ContextData> = new Map();
  private maxCacheSize = 100;
  private embeddingEnabled = false;

  constructor() {
    this.checkEmbeddingSupport();
  }

  private async checkEmbeddingSupport() {
    // Check if we have access to embedding APIs
    this.embeddingEnabled = !!(
      import.meta.env.VITE_OPENAI_API_KEY || 
      import.meta.env.VITE_GEMINI_API_KEY
    );
  }

  /**
   * Store a memory with automatic importance scoring
   */
  async storeMemory(
    userId: string, 
    content: string, 
    context: Record<string, any> = {}
  ): Promise<void> {
    const importance = this.calculateImportance(content, context);
    
    const memory: MemoryEntry = {
      content,
      context,
      timestamp: new Date(),
      importance,
      userId
    };

    // Generate embedding if enabled
    if (this.embeddingEnabled) {
      memory.embedding = await this.generateEmbedding(content);
    }

    // Store in Supabase
    try {
      const { error } = await supabase
        .from('memory_contexts')
        .insert({
          user_id: userId,
          session_id: userId,
          content,
          context_type: 'conversation',
          importance_score: importance,
          metadata: context
        });

      if (error) throw error;
    } catch (error) {
      console.warn('Failed to store in Supabase, using local cache:', error);
    }

    // Update local cache
    const userMemories = this.memoryCache.get(userId) || [];
    userMemories.push(memory);
    
    // Keep only most important memories
    if (userMemories.length > this.maxCacheSize) {
      userMemories.sort((a, b) => b.importance - a.importance);
      userMemories.splice(this.maxCacheSize);
    }
    
    this.memoryCache.set(userId, userMemories);
  }

  /**
   * Retrieve relevant memories using semantic search
   */
  async retrieveMemories(
    userId: string, 
    query: string, 
    limit: number = 5
  ): Promise<MemoryEntry[]> {
    // Try semantic search first if embeddings enabled
    if (this.embeddingEnabled) {
      try {
        const queryEmbedding = await this.generateEmbedding(query);
        const embeddingString = `[${queryEmbedding.join(',')}]`;
        
        const { data, error } = await supabase.rpc('match_memories', {
          query_embedding: embeddingString,
          match_threshold: 0.7,
          match_count: limit
        });

        if (!error && data && Array.isArray(data)) {
          return data.map((item: any) => ({
            id: item.id,
            content: item.content,
            context: item.metadata || {},
            timestamp: new Date(item.ts),
            importance: item.similarity || 0.5
          }));
        }
      } catch (error) {
        console.warn('Semantic search failed, using keyword search:', error);
      }
    }

    // Fallback to keyword-based search
    const userMemories = this.memoryCache.get(userId) || [];
    const keywords = query.toLowerCase().split(' ');
    
    return userMemories
      .filter(memory => 
        keywords.some(keyword => 
          memory.content.toLowerCase().includes(keyword)
        )
      )
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * Build context for AI interactions
   */
  async buildContext(userId: string, currentMessage: string): Promise<ContextData> {
    // Check cache first
    const cached = this.contextCache.get(userId);
    if (cached) return cached;

    // Retrieve relevant memories
    const memories = await this.retrieveMemories(userId, currentMessage, 10);
    
    // Extract entities and topics
    const entities = this.extractEntities(memories.map(m => m.content).join(' '));
    const topics = this.extractTopics(memories.map(m => m.content));
    
    // User preferences - simplified (no DB query for now)
    const userPreferences = {};


    const context: ContextData = {
      userPreferences,
      conversationHistory: memories.map(m => m.content),
      entities,
      topics,
      sentiment: this.analyzeSentiment(memories.map(m => m.content))
    };

    this.contextCache.set(userId, context);
    return context;
  }

  /**
   * Calculate importance score for a memory
   */
  private calculateImportance(content: string, context: Record<string, any>): number {
    let score = 0.5; // Base score

    // Longer content is often more important
    if (content.length > 100) score += 0.1;
    if (content.length > 300) score += 0.1;

    // Questions are important
    if (content.includes('?')) score += 0.1;

    // Emotional content is important
    const emotionalWords = ['love', 'hate', 'amazing', 'terrible', 'important', 'critical'];
    if (emotionalWords.some(word => content.toLowerCase().includes(word))) {
      score += 0.2;
    }

    // Context-based importance
    if (context.emotion) score += 0.1;
    if (context.confidence && context.confidence > 0.8) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Generate embedding for semantic search
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embeddings if available
    if (import.meta.env.VITE_OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: text
          })
        });

        const data = await response.json();
        return data.data[0].embedding;
      } catch (error) {
        console.warn('OpenAI embedding failed:', error);
      }
    }

    // Fallback: simple hash-based embedding
    return this.simpleEmbedding(text);
  }

  /**
   * Simple embedding fallback
   */
  private simpleEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Standard embedding size
    
    words.forEach((word, idx) => {
      const hash = this.hashCode(word);
      embedding[hash % embedding.length] += 1;
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Extract named entities from text
   */
  private extractEntities(text: string): Map<string, any> {
    const entities = new Map();
    
    // Simple entity extraction (can be enhanced with NLP)
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /https?:\/\/[^\s]+/g,
      number: /\b\d+\.?\d*\b/g
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        entities.set(type, matches);
      }
    }

    return entities;
  }

  /**
   * Extract topics from conversation
   */
  private extractTopics(texts: string[]): string[] {
    const allText = texts.join(' ').toLowerCase();
    const words = allText.split(/\s+/);
    
    // Count word frequency
    const frequency = new Map<string, number>();
    words.forEach(word => {
      if (word.length > 4) { // Only meaningful words
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    });

    // Get top topics
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(texts: string[]): number {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry'];
    
    let score = 0;
    const allText = texts.join(' ').toLowerCase();
    
    positiveWords.forEach(word => {
      const matches = allText.match(new RegExp(word, 'g'));
      if (matches) score += matches.length;
    });
    
    negativeWords.forEach(word => {
      const matches = allText.match(new RegExp(word, 'g'));
      if (matches) score -= matches.length;
    });
    
    return Math.max(-1, Math.min(1, score / 10)); // Normalize to -1 to 1
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: string): void {
    this.memoryCache.delete(userId);
    this.contextCache.delete(userId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { users: number; memories: number; contexts: number } {
    return {
      users: this.memoryCache.size,
      memories: Array.from(this.memoryCache.values()).reduce((sum, arr) => sum + arr.length, 0),
      contexts: this.contextCache.size
    };
  }
}

export const consolidatedMemory = new ConsolidatedMemoryService();

