// Context Management System for Eliza
// Intelligently manages context switching between knowledge sources

import { xmrtKnowledge, XMRTKnowledgeEntry } from '../data/xmrtKnowledgeBase';
import { WebSearchService, webSearchService, SearchContext, SearchResult } from './webSearchService';

export interface ResponseContext {
  source: 'knowledge' | 'web' | 'mining' | 'hybrid';
  confidence: number;
  knowledgeEntries?: XMRTKnowledgeEntry[];
  webResults?: SearchResult[];
  miningData?: any;
  responseStrategy: 'immediate' | 'search_enhanced' | 'comprehensive';
}

export interface UserPreferences {
  preferRealTimeData: boolean;
  technicalLevel: 'beginner' | 'intermediate' | 'expert';
  interests: string[];
  responseStyle: 'concise' | 'detailed' | 'educational';
}

export class ContextManager {
  private sessionMemory: Map<string, any> = new Map();
  private userPreferences: UserPreferences = {
    preferRealTimeData: true,
    technicalLevel: 'intermediate',
    interests: [],
    responseStyle: 'detailed'
  };

  // Main context analysis and response routing
  async analyzeContext(query: string, miningData?: any): Promise<ResponseContext> {
    const isXMRTRelated = xmrtKnowledge.isXMRTRelated(query);
    const searchPriority = WebSearchService.getSearchPriority(query);
    const searchCategory = WebSearchService.getSearchCategory(query);

    // Strategy 1: Immediate knowledge-based response
    if (isXMRTRelated && searchPriority === 'low') {
      const knowledgeEntries = xmrtKnowledge.searchKnowledge(query);
      
      if (knowledgeEntries.length > 0 && knowledgeEntries[0].confidence > 0.8) {
        return {
          source: 'knowledge',
          confidence: knowledgeEntries[0].confidence,
          knowledgeEntries,
          responseStrategy: 'immediate'
        };
      }
    }

    // Strategy 2: Real-time data priority
    if (this.requiresRealTimeData(query) || searchPriority === 'high') {
      try {
        const searchContext: SearchContext = {
          query,
          category: searchCategory,
          priority: searchPriority,
          miningData
        };

        const webResults = await webSearchService.searchWithGemini(searchContext);
        const knowledgeEntries = isXMRTRelated ? xmrtKnowledge.searchKnowledge(query) : [];

        return {
          source: webResults.length > 0 ? 'hybrid' : 'knowledge',
          confidence: this.calculateHybridConfidence(knowledgeEntries, webResults),
          knowledgeEntries,
          webResults,
          miningData,
          responseStrategy: 'search_enhanced'
        };
      } catch (error) {
        console.error('Web search failed, falling back to knowledge base:', error);
        return this.getFallbackContext(query);
      }
    }

    // Strategy 3: Mining-specific context
    if (searchCategory === 'mining' && miningData) {
      const miningContext = xmrtKnowledge.getMiningContext();
      return {
        source: 'mining',
        confidence: 0.9,
        knowledgeEntries: miningContext,
        miningData,
        responseStrategy: 'comprehensive'
      };
    }

    // Strategy 4: Comprehensive response for complex queries
    if (query.length > 100 || this.isComplexQuery(query)) {
      const knowledgeEntries = xmrtKnowledge.searchKnowledge(query);
      return {
        source: 'knowledge',
        confidence: knowledgeEntries.length > 0 ? 0.7 : 0.5,
        knowledgeEntries,
        responseStrategy: 'comprehensive'
      };
    }

    // Default fallback
    return this.getFallbackContext(query);
  }

  // Check if query requires real-time data
  private requiresRealTimeData(query: string): boolean {
    const realTimeKeywords = [
      'current', 'now', 'today', 'latest', 'recent', 'live', 'real-time',
      'price', 'hashrate', 'difficulty', 'market', 'status', 'update'
    ];

    const queryLower = query.toLowerCase();
    return realTimeKeywords.some(keyword => queryLower.includes(keyword));
  }

  // Check if query is complex and needs comprehensive response
  private isComplexQuery(query: string): boolean {
    const complexityIndicators = [
      'how does', 'explain', 'what is the difference', 'compare',
      'advantages', 'disadvantages', 'pros and cons', 'overview',
      'architecture', 'implementation', 'technical details'
    ];

    const queryLower = query.toLowerCase();
    return complexityIndicators.some(indicator => queryLower.includes(indicator));
  }

  // Calculate confidence for hybrid responses
  private calculateHybridConfidence(knowledge: XMRTKnowledgeEntry[], web: SearchResult[]): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence with knowledge base matches
    if (knowledge.length > 0) {
      const avgKnowledgeConfidence = knowledge.reduce((sum, entry) => sum + entry.confidence, 0) / knowledge.length;
      confidence += avgKnowledgeConfidence * 0.3;
    }

    // Boost confidence with high-relevance web results
    if (web.length > 0) {
      const avgWebRelevance = web.reduce((sum, result) => sum + result.relevance, 0) / web.length;
      confidence += (avgWebRelevance / 10) * 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  // Fallback context when other strategies fail
  private getFallbackContext(query: string): ResponseContext {
    const knowledgeEntries = xmrtKnowledge.searchKnowledge(query);
    
    return {
      source: 'knowledge',
      confidence: knowledgeEntries.length > 0 ? 0.6 : 0.3,
      knowledgeEntries: knowledgeEntries.length > 0 ? knowledgeEntries : [
        {
          topic: "General XMRT Information",
          content: xmrtKnowledge.getEcosystemOverview(),
          category: 'ecosystem',
          keywords: ['overview', 'general', 'introduction'],
          confidence: 0.5
        }
      ],
      responseStrategy: 'immediate'
    };
  }

  // Generate contextual response based on analysis
  generateContextualResponse(context: ResponseContext, query: string): string {
    let response = '';

    // Add knowledge base information
    if (context.knowledgeEntries && context.knowledgeEntries.length > 0) {
      response += this.formatKnowledgeResponse(context.knowledgeEntries, context.responseStrategy);
    }

    // Add real-time web information
    if (context.webResults && context.webResults.length > 0) {
      response += '\n\n' + WebSearchService.formatSearchResults(context.webResults);
    }

    // Add mining-specific context
    if (context.miningData && context.source === 'mining') {
      response += this.formatMiningContext(context.miningData);
    }

    // Add confidence and source information for transparency
    response += `\n\n🔍 **Response Context:**\n`;
    response += `• Source: ${context.source} (${Math.round(context.confidence * 100)}% confidence)\n`;
    response += `• Strategy: ${context.responseStrategy}\n`;

    return response.trim();
  }

  // Format knowledge base entries for response
  private formatKnowledgeResponse(entries: XMRTKnowledgeEntry[], strategy: string): string {
    if (entries.length === 0) return '';

    let response = '📚 **XMRT Knowledge Base:**\n\n';

    if (strategy === 'immediate') {
      // Use the best match for immediate responses
      const bestEntry = entries[0];
      response += `**${bestEntry.topic}**\n${bestEntry.content}`;
    } else {
      // Use multiple entries for comprehensive responses
      entries.slice(0, 3).forEach((entry, index) => {
        response += `**${index + 1}. ${entry.topic}**\n`;
        response += `${entry.content}\n`;
        response += `*Category: ${entry.category} | Confidence: ${Math.round(entry.confidence * 100)}%*\n\n`;
      });
    }

    return response;
  }

  // Format mining-specific context
  private formatMiningContext(miningData: any): string {
    if (!miningData) return '';

    let response = '\n\n⛏️ **Current Mining Context:**\n';
    
    if (miningData.hashrate) {
      response += `• Current Hashrate: ${miningData.hashrate}\n`;
    }
    if (miningData.difficulty) {
      response += `• Mining Difficulty: ${miningData.difficulty}\n`;
    }
    if (miningData.poolStats) {
      response += `• Pool Statistics: ${JSON.stringify(miningData.poolStats, null, 2)}\n`;
    }

    return response;
  }

  // Update user preferences based on interaction patterns
  updateUserPreferences(query: string, feedback?: 'helpful' | 'not_helpful') {
    // Extract interests from query
    const interests = this.extractInterests(query);
    interests.forEach(interest => {
      if (!this.userPreferences.interests.includes(interest)) {
        this.userPreferences.interests.push(interest);
      }
    });

    // Adjust preferences based on feedback
    if (feedback === 'helpful') {
      // Reinforce current strategies
    } else if (feedback === 'not_helpful') {
      // Adjust strategy for similar queries
    }

    // Store in session memory
    this.sessionMemory.set('userPreferences', this.userPreferences);
  }

  // Extract interests from user queries
  private extractInterests(query: string): string[] {
    const interests: string[] = [];
    const queryLower = query.toLowerCase();

    const interestKeywords = {
      'mining': ['mining', 'hashrate', 'pool', 'profitability'],
      'dao': ['dao', 'governance', 'voting', 'proposal'],
      'technical': ['technical', 'code', 'implementation', 'architecture'],
      'market': ['price', 'market', 'trading', 'investment'],
      'mobile': ['mobile', 'phone', 'android', 'ios'],
      'privacy': ['privacy', 'monero', 'anonymous', 'secure']
    };

    Object.entries(interestKeywords).forEach(([interest, keywords]) => {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        interests.push(interest);
      }
    });

    return interests;
  }

  // Get session memory for context continuity
  getSessionContext(key: string): any {
    return this.sessionMemory.get(key);
  }

  // Set session memory
  setSessionContext(key: string, value: any): void {
    this.sessionMemory.set(key, value);
  }

  // Clear session memory
  clearSession(): void {
    this.sessionMemory.clear();
  }
}

export const contextManager = new ContextManager();