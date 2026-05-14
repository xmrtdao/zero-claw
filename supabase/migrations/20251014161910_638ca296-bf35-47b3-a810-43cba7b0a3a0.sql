-- Phase 1: Fix Security Definer Views
-- Convert SECURITY DEFINER views to SECURITY INVOKER to enforce RLS policies

ALTER VIEW public.active_devices_view 
SET (security_invoker = true);

ALTER VIEW public.pop_leaderboard_view 
SET (security_invoker = true);

-- Phase 3: Add Function Usage Analytics
-- Track Eliza's edge function usage patterns

CREATE TABLE IF NOT EXISTS public.eliza_function_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invoked_by TEXT DEFAULT 'eliza',
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_function_usage_name ON eliza_function_usage(function_name);
CREATE INDEX idx_function_usage_timestamp ON eliza_function_usage(invoked_at DESC);

-- Enable RLS on function usage table
ALTER TABLE public.eliza_function_usage ENABLE ROW LEVEL SECURITY;

-- Anyone can view function usage stats
CREATE POLICY "Anyone can view function usage stats"
ON public.eliza_function_usage
FOR SELECT
USING (true);

-- Service role can insert usage logs
CREATE POLICY "Service role can insert function usage"
ON public.eliza_function_usage
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Analytics view for function usage patterns
CREATE VIEW public.eliza_function_analytics AS
SELECT 
  function_name,
  COUNT(*) as total_invocations,
  COUNT(*) FILTER (WHERE success = true) as successful_calls,
  COUNT(*) FILTER (WHERE success = false) as failed_calls,
  ROUND(AVG(execution_time_ms)::numeric, 2) as avg_execution_time_ms,
  MAX(invoked_at) as last_used,
  MIN(invoked_at) as first_used
FROM eliza_function_usage
GROUP BY function_name
ORDER BY total_invocations DESC;