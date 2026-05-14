import { supabase } from '@/integrations/supabase/client';

export interface TokenValidationResult {
  isValid: boolean;
  user?: string;
  scopes?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
  error?: string;
}

/**
 * Validate a user-provided GitHub PAT by invoking the api-key-health-monitor
 * with session credentials
 */
export async function validateSessionGitHubPAT(pat: string): Promise<TokenValidationResult> {
  try {
    console.log('🔍 Validating session GitHub PAT...');
    
    const { data, error } = await supabase.functions.invoke('api-key-health-monitor', {
      body: { 
        session_credentials: { 
          github_pat: pat 
        } 
      }
    });

    if (error) {
      console.error('❌ PAT validation error:', error);
      return {
        isValid: false,
        error: error.message
      };
    }

    const githubResult = data?.results?.find((r: any) => r.service_name === 'github_session');
    
    if (!githubResult) {
      return {
        isValid: false,
        error: 'No GitHub validation result returned'
      };
    }

    if (githubResult.is_healthy) {
      console.log('✅ Session PAT validated successfully');
      return {
        isValid: true,
        user: githubResult.metadata?.user,
        scopes: githubResult.metadata?.scopes,
        rateLimit: githubResult.metadata?.rate_limit ? {
          limit: githubResult.metadata.rate_limit.limit,
          remaining: githubResult.metadata.rate_limit.remaining,
          reset: new Date(githubResult.metadata.rate_limit.reset * 1000)
        } : undefined
      };
    }

    return {
      isValid: false,
      error: githubResult.error_message || 'Token validation failed'
    };

  } catch (error) {
    console.error('❌ Unexpected error validating PAT:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
