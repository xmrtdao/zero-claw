// HARPA AI Integration Test Service
// Quick test utility to verify HARPA AI connectivity and functionality

import { harpaAIService, HarpaBrowsingContext } from './harpaAIService';

export class HarpaAITestService {
  // Test basic connectivity
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing HARPA AI connection...');
      
      const testContext: HarpaBrowsingContext = {
        query: 'test connection HARPA AI',
        action: 'search',
        maxResults: 1
      };

      const results = await harpaAIService.browse(testContext);
      
      if (results && results.length > 0) {
        return {
          success: true,
          message: `✅ HARPA AI connected successfully! Received ${results.length} result(s).`
        };
      } else {
        return {
          success: false,
          message: '⚠️ HARPA AI connected but returned no results. API may be rate limited.'
        };
      }
    } catch (error) {
      console.error('HARPA AI test error:', error);
      return {
        success: false,
        message: `❌ HARPA AI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Test scraping functionality
  static async testScraping(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing HARPA AI scraping...');
      
      const testContext: HarpaBrowsingContext = {
        query: 'scrape test',
        action: 'scrape',
        urls: ['https://harpa.ai'],
        maxResults: 1
      };

      const results = await harpaAIService.browse(testContext);
      
      return {
        success: results.length > 0,
        message: results.length > 0 
          ? `✅ HARPA AI scraping works! Scraped content from ${testContext.urls?.length} URL(s).`
          : '⚠️ HARPA AI scraping returned no results.'
      };
    } catch (error) {
      console.error('HARPA AI scraping test error:', error);
      return {
        success: false,
        message: `❌ HARPA AI scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Run comprehensive test suite
  static async runFullTest(): Promise<{ success: boolean; results: string[] }> {
    const results: string[] = [];
    let overallSuccess = true;

    console.log('🚀 Running HARPA AI full test suite...');

    // Test 1: Basic Connection
    const connectionTest = await this.testConnection();
    results.push(connectionTest.message);
    if (!connectionTest.success) overallSuccess = false;

    // Test 2: Scraping
    const scrapingTest = await this.testScraping();
    results.push(scrapingTest.message);
    if (!scrapingTest.success) overallSuccess = false;

    // Test 3: Service Status
    const status = harpaAIService.getStatus();
    results.push(`📊 Service Status: ${status.connected ? 'Connected' : 'Disconnected'} (API Key: ${status.apiKey})`);

    // Test 4: Different Actions
    const actions = ['analyze', 'summarize'] as const;
    for (const action of actions) {
      try {
        const testContext: HarpaBrowsingContext = {
          query: `test ${action} functionality`,
          action,
          maxResults: 1
        };
        
        const actionResults = await harpaAIService.browse(testContext);
        results.push(`🎯 ${action.toUpperCase()} test: ${actionResults.length > 0 ? 'PASS' : 'WARN'}`);
      } catch (error) {
        results.push(`🎯 ${action.toUpperCase()} test: FAIL - ${error instanceof Error ? error.message : 'Unknown error'}`);
        overallSuccess = false;
      }
    }

    return { success: overallSuccess, results };
  }

  // Quick status check
  static getServiceInfo(): string {
    const status = harpaAIService.getStatus();
    return `HARPA AI Service: ${status.connected ? '🟢 ONLINE' : '🔴 OFFLINE'} | API Key: ${status.apiKey}`;
  }
}

// Export for easy testing
export const testHarpaAI = HarpaAITestService;