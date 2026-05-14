-- Phase 4: Database Schema Enhancements - Add Missing Tables Only

-- =====================================================================
-- GITHUB API USAGE TRACKING TABLE (New)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.github_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  repo TEXT,
  credential_type TEXT, -- 'oauth', 'pat', 'backend'
  response_time_ms INTEGER,
  status_code INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  rate_limit_remaining INTEGER,
  rate_limit_reset TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_usage_action ON public.github_api_usage(action);
CREATE INDEX IF NOT EXISTS idx_github_usage_created_at ON public.github_api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_usage_cred_type ON public.github_api_usage(credential_type);
CREATE INDEX IF NOT EXISTS idx_github_usage_success ON public.github_api_usage(success);

COMMENT ON TABLE public.github_api_usage IS 'Logs all GitHub API calls for rate limit tracking, performance monitoring, and debugging';
