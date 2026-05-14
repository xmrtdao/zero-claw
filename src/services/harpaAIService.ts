// HARPA AI Agentic Browsing Service for Multi-step Tasks
export interface HarpaBrowsingResult {
  title: string;
  url: string;
  content: string;
  summary: string;
  snippet?: string; // Add snippet property
  relevance: number;
  timestamp: Date;
  source: 'harpa';
}

export interface HarpaBrowsingContext {
  query: string;
  action: 'search' | 'scrape' | 'analyze' | 'summarize';
  category?: 'mining' | 'dao' | 'technical' | 'general' | 'market' | 'news';
  urls?: string[];
  maxResults?: number;
}

export class HarpaAIService {
  private apiKey: string;
  private baseUrl = 'https://api.harpa.ai/api/v1/grid';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Main agentic browsing method
  async browse(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    try {
      console.log('🤖 Harpa AI: Initiating agentic browsing...', context.query);
      
      switch (context.action) {
        case 'search':
          return await this.performWebSearch(context);
        case 'scrape':
          return await this.scrapeUrls(context);
        case 'analyze':
          return await this.analyzeContent(context);
        case 'summarize':
          return await this.summarizeContent(context);
        default:
          return await this.performWebSearch(context);
      }
    } catch (error) {
      console.error('❌ Harpa AI browsing error:', error);
      return [];
    }
  }

  // Perform web search using Harpa AI
  private async performWebSearch(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    try {
      console.log('🔍 HARPA AI: Performing web search for:', context.query);
      
      if (!this.apiKey) {
        console.warn('⚠️ HARPA AI: No API key available');
        return [];
      }
      
      const payload = {
        action: 'scrape',
        url: `https://www.google.com/search?q=${encodeURIComponent(context.query)}`,
        grab: [
          {"selector": "h3", "at": "all", "label": "titles"},
          {"selector": ".VwiC3b", "at": "all", "label": "snippets"},
          {"selector": "cite", "at": "all", "label": "urls"}
        ],
        node: "search"
      };
      
      console.log('🌐 HARPA AI: Making request to:', this.baseUrl);
      console.log('📝 HARPA AI: Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('📡 HARPA AI: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HARPA AI API error:', response.status, errorText);
        throw new Error(`HARPA AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ HARPA AI: Response data:', data);
      
      return this.parseHarpaResults(data.data || data.results || []);
      
    } catch (error) {
      console.error('❌ HARPA AI search error:', error);
      return [];
    }
  }

  private async scrapeUrls(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    if (!context.urls || context.urls.length === 0) return [];
    
    try {
      console.log('🕷️ HARPA AI: Scraping URLs:', context.urls);
      
      const results: HarpaBrowsingResult[] = [];
      
      for (const url of context.urls.slice(0, 10)) { // Expanded URL browsing limit
        const payload = {
          action: 'scrape',
          url: url,
          grab: [
            {"selector": "h1, h2, h3", "at": "all", "label": "headings"},
            {"selector": "p", "at": "first-10", "label": "paragraphs"},
            {"selector": "title", "at": "first", "label": "title"}
          ],
          node: "content"
        };
        
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          const data = await response.json();
          const parsed = this.parseHarpaScrapeData(data.data || {}, url);
          if (parsed) results.push(parsed);
        }
      }
      
      console.log('✅ HARPA AI: Scraped', results.length, 'URLs');
      return results;
      
    } catch (error) {
      console.error('❌ HARPA AI scrape error:', error);
      return [];
    }
  }

  private async analyzeContent(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    return this.performWebSearch({ ...context, query: `Analyze: ${context.query}` });
  }

  private async summarizeContent(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    return this.performWebSearch({ ...context, query: `Summarize: ${context.query}` });
  }

  private parseHarpaResults(results: any[]): HarpaBrowsingResult[] {
    console.log('🔍 HARPA AI: Parsing results:', results);
    
    if (!Array.isArray(results)) {
      console.warn('⚠️ HARPA AI: Results is not an array:', results);
      return [];
    }
    
    return results.map((result, index) => ({
      title: result.titles?.[0] || result.title || `Result ${index + 1}`,
      url: result.urls?.[0] || result.url || 'https://example.com',
      content: result.snippets?.[0] || result.content || result.snippet || 'No content available',
      summary: result.snippets?.[0] || result.summary || result.snippet || 'No summary available',
      snippet: result.snippets?.[0] || result.snippet || result.content || 'No snippet available',
      relevance: result.relevance || 0.8,
      timestamp: new Date(),
      source: 'harpa' as const
    })).filter(result => result.title && result.content);
  }

  private parseHarpaScrapeData(data: any, url: string): HarpaBrowsingResult | null {
    try {
      const title = data.title?.[0] || 'Scraped Content';
      const headings = data.headings || [];
      const paragraphs = data.paragraphs || [];
      
      const content = [...headings, ...paragraphs].join(' ').substring(0, 1000);
      
      if (!content) return null;
      
      return {
        title,
        url,
        content,
        summary: content.substring(0, 200) + '...',
        snippet: content.substring(0, 150) + '...',
        relevance: 0.9,
        timestamp: new Date(),
        source: 'harpa' as const
      };
    } catch (error) {
      console.error('❌ HARPA AI: Parse error:', error);
      return null;
    }
  }

  // Static method to format browsing results
  static formatBrowsingResults(results: HarpaBrowsingResult[]): string {
    if (!results.length) return 'No web intelligence available.';
    
    return results.map(result => 
      `${result.title}: ${result.summary}`
    ).join('; ');
  }

  // Check if service is available
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  // Get service status
  getStatus(): { connected: boolean; apiKey: string } {
    return {
      connected: !!this.apiKey,
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : 'Not set'
    };
  }
}

// Create and export the service instance using environment variable
const harpaApiKey = import.meta.env.VITE_HARPA_API_KEY || '';
export const harpaAIService = new HarpaAIService(harpaApiKey);

// Log HARPA AI status on initialization
console.log('🔧 HARPA AI Service Status:', {
  hasApiKey: !!harpaApiKey,
  keyPreview: harpaApiKey ? `***${harpaApiKey.slice(-4)}` : 'Not set'
});