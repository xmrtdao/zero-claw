import { EDGE_FUNCTIONS_REGISTRY } from '../_shared/edgeFunctionRegistry.ts';
import { startUsageTracking } from '../_shared/functionUsageLogger.ts';

const FUNCTION_NAME = 'search-edge-functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const usageTracker = startUsageTracking(FUNCTION_NAME, undefined, { method: req.method });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, category, limit } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Searching edge functions for: "${query}"${category ? ` (category: ${category})` : ''}`);

    // Filter by category if provided
    let functions = category 
      ? EDGE_FUNCTIONS_REGISTRY.filter((f: any) => f.category === category)
      : EDGE_FUNCTIONS_REGISTRY;

    // Search across name, description, capabilities, and example_use
    // Tokenize query so multi-word checklist items like "Execute plan" still match
    // partial capabilities such as "execute", "plan", etc.
    const queryLower = query.toLowerCase().trim();
    const queryTokens = queryLower
      .split(/\s+/)
      .map((token: string) => token.trim())
      .filter((token: string) => token.length >= 3);
    const maxResults = typeof limit === 'number' && limit > 0
      ? Math.min(limit, 25)
      : 10;

    const includesQueryOrToken = (value: string): boolean => {
      const normalized = value.toLowerCase();
      if (normalized.includes(queryLower)) return true;
      return queryTokens.some((token: string) => normalized.includes(token));
    };

    const results = functions
      .map((fn: any) => {
        let score = 0;
        
        // Exact name match gets highest score
        if (fn.name.toLowerCase() === queryLower) score += 100;
        else if (includesQueryOrToken(fn.name)) score += 50;
        
        // Description matches
        if (includesQueryOrToken(fn.description)) score += 30;
        
        // Capability matches
        const capabilityMatch = fn.capabilities.some((cap: string) => 
          includesQueryOrToken(cap)
        );
        if (capabilityMatch) score += 40;
        
        // Example use matches
        if (includesQueryOrToken(fn.example_use)) score += 20;
        
        return { ...fn, relevance_score: score };
      })
      .filter((fn: any) => fn.relevance_score > 0)
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);

    console.log(`✅ Found ${results.length} matching functions`);
    await usageTracker.success({ query, results_count: results.length });

    return new Response(
      JSON.stringify({
        query,
        category,
        results,
        // Legacy alias for existing callers that expect `functions`
        functions: results,
        total_functions_searched: functions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error searching edge functions:', error);
    await usageTracker.failure(error.message, 500);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
