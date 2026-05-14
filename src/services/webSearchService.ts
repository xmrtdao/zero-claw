// Web Search Integration Service for Eliza
// Provides real-time web access and context-aware search capabilities

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  source: 'gemini' | 'web';
}

export interface SearchContext {
  query: string;
  category: 'mining' | 'dao' | 'technical' | 'general' | 'market' | 'news';
  priority: 'high' | 'medium' | 'low';
  miningData?: any;
}

export class WebSearchService {
  private geminiApiKey: string | null = null;

  constructor(geminiApiKey?: string) {
    this.geminiApiKey = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || null;
  }

  setGeminiApiKey(apiKey: string) {
    this.geminiApiKey = apiKey;
  }

  // Enhanced search with Gemini's web browsing capabilities
  async searchWithGemini(context: SearchContext): Promise<SearchResult[]> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key required for web search');
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const searchPrompt = this.buildSearchPrompt(context);
      
      const result = await model.generateContent(searchPrompt);
      const response = await result.response;
      const searchResults = response.text();

      return this.parseGeminiSearchResults(searchResults, context);
    } catch (error) {
      console.error('Gemini search error:', error);
      return [];
    }
  }

  // Context-aware search prompt building
  private buildSearchPrompt(context: SearchContext): string {
    const basePrompt = `Search the web for current information about: "${context.query}"`;
    
    let contextualPrompt = basePrompt;

    switch (context.category) {
      case 'mining':
        contextualPrompt += `\n\nFocus on:
        - Current hashrates and mining difficulty
        - Mobile mining developments and apps
        - Monero (XMR) mining pools and profitability
        - Hardware optimization for mobile devices
        - Energy efficiency and thermal management
        ${context.miningData ? `\nCurrent mining context: ${JSON.stringify(context.miningData)}` : ''}`;
        break;

      case 'dao':
        contextualPrompt += `\n\nFocus on:
        - DAO governance mechanisms and voting
        - Autonomous decision-making systems
        - Decentralized organizations and treasury management
        - Blockchain governance tokens and mechanisms
        - Community-driven project developments`;
        break;

      case 'technical':
        contextualPrompt += `\n\nFocus on:
        - Technical implementations and architecture
        - Smart contract developments
        - Blockchain technology updates
        - Developer tools and frameworks
        - Security audits and best practices`;
        break;

      case 'market':
        contextualPrompt += `\n\nFocus on:
        - Current cryptocurrency prices and market trends
        - Trading volumes and market analysis
        - DeFi protocol developments
        - Token economics and market movements
        - Investment and adoption news`;
        break;

      case 'news':
        contextualPrompt += `\n\nFocus on:
        - Recent developments and announcements
        - Industry news and regulatory updates
        - Project partnerships and collaborations
        - Community updates and milestones
        - Technology breakthroughs and innovations`;
        break;

      default:
        contextualPrompt += '\n\nProvide comprehensive and current information.';
    }

    contextualPrompt += `\n\nPlease format your response as a structured list with:
    1. Title of each finding
    2. Source URL (if available)
    3. Brief summary (2-3 sentences)
    4. Relevance score (1-10)
    
    Prioritize recent, credible sources and focus on factual information.`;

    return contextualPrompt;
  }

  // Parse Gemini search results into structured format
  private parseGeminiSearchResults(searchText: string, context: SearchContext): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Simple parsing logic - in production, this would be more sophisticated
    const lines = searchText.split('\n').filter(line => line.trim());
    
    let currentResult: Partial<SearchResult> = {};
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        // Save previous result if complete
        if (currentResult.title && currentResult.snippet) {
          results.push({
            title: currentResult.title,
            url: currentResult.url || '',
            snippet: currentResult.snippet,
            relevance: currentResult.relevance || 5,
            source: 'gemini'
          });
        }
        
        // Start new result
        currentResult = {
          title: line.replace(/^\d+\.\s*/, '').trim()
        };
      } else if (line.toLowerCase().includes('http')) {
        currentResult.url = line.trim();
      } else if (line.includes('Summary:') || line.includes('Description:')) {
        currentResult.snippet = line.replace(/^(Summary|Description):\s*/i, '').trim();
      } else if (line.includes('Relevance:') || line.includes('Score:')) {
        const scoreMatch = line.match(/(\d+)/);
        if (scoreMatch) {
          currentResult.relevance = parseInt(scoreMatch[1]);
        }
      } else if (currentResult.title && !currentResult.snippet && line.trim().length > 20) {
        currentResult.snippet = line.trim();
      }
    }

    // Add last result if complete
    if (currentResult.title && currentResult.snippet) {
      results.push({
        title: currentResult.title,
        url: currentResult.url || '',
        snippet: currentResult.snippet,
        relevance: currentResult.relevance || 5,
        source: 'gemini'
      });
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  // Determine search priority based on query content
  static getSearchPriority(query: string): 'high' | 'medium' | 'low' {
    const highPriorityKeywords = [
      'urgent', 'emergency', 'critical', 'breaking', 'alert', 'immediate',
      'current price', 'live', 'real-time', 'now', 'today'
    ];
    
    const mediumPriorityKeywords = [
      'recent', 'latest', 'update', 'new', 'current', 'status'
    ];

    const queryLower = query.toLowerCase();
    
    if (highPriorityKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'high';
    } else if (mediumPriorityKeywords.some(keyword => queryLower.includes(keyword))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Determine search category based on query content
  static getSearchCategory(query: string): SearchContext['category'] {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('mining') || queryLower.includes('hashrate') || 
        queryLower.includes('pool') || queryLower.includes('difficulty')) {
      return 'mining';
    } else if (queryLower.includes('dao') || queryLower.includes('governance') || 
               queryLower.includes('voting') || queryLower.includes('proposal')) {
      return 'dao';
    } else if (queryLower.includes('technical') || queryLower.includes('code') || 
               queryLower.includes('smart contract') || queryLower.includes('implementation')) {
      return 'technical';
    } else if (queryLower.includes('price') || queryLower.includes('market') || 
               queryLower.includes('trading') || queryLower.includes('exchange')) {
      return 'market';
    } else if (queryLower.includes('news') || queryLower.includes('announcement') || 
               queryLower.includes('development') || queryLower.includes('partnership')) {
      return 'news';
    } else {
      return 'general';
    }
  }

  // Format search results for display
  static formatSearchResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No current web results found.';
    }

    let formatted = '🌐 **Current Web Information:**\n\n';
    
    results.slice(0, 5).forEach((result, index) => {
      formatted += `**${index + 1}. ${result.title}**\n`;
      if (result.url) {
        formatted += `🔗 ${result.url}\n`;
      }
      formatted += `📄 ${result.snippet}\n`;
      formatted += `⭐ Relevance: ${result.relevance}/10\n\n`;
    });

    return formatted.trim();
  }
}

export const webSearchService = new WebSearchService(import.meta.env.VITE_GEMINI_API_KEY);