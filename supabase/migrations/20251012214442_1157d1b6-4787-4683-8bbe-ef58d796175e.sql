-- ====================================================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- ====================================================================

-- 1.1 Fix Row Level Security on memory_contexts table
-- DROP overly permissive policy that allows anyone to access all memories
DROP POLICY IF EXISTS "Allow all operations on memory_contexts" ON public.memory_contexts;

-- Create proper user-based policies
CREATE POLICY "Users can read their own memories"
  ON public.memory_contexts FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own memories"
  ON public.memory_contexts FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own memories"
  ON public.memory_contexts FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own memories"
  ON public.memory_contexts FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Service role full access to memories"
  ON public.memory_contexts FOR ALL
  USING (auth.role() = 'service_role');

-- 1.2 Fix function search_path warnings
ALTER FUNCTION public.batch_vectorize_memories() SET search_path = public;
ALTER FUNCTION public.generate_conversation_insights() SET search_path = public;
ALTER FUNCTION public.auto_extract_knowledge_entities() SET search_path = public;
ALTER FUNCTION public.auto_schedule_task_execution() SET search_path = public;
ALTER FUNCTION public.auto_system_maintenance() SET search_path = public;
ALTER FUNCTION public.auto_update_interaction_patterns() SET search_path = public;
ALTER FUNCTION public.auto_vectorize_memory() SET search_path = public;
ALTER FUNCTION public.check_session_ownership(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.match_knowledge_entities(text, integer) SET search_path = public;
ALTER FUNCTION public.match_memories(vector, double precision, integer, text) SET search_path = public;
ALTER FUNCTION public.reset_manus_tokens() SET search_path = public;
ALTER FUNCTION public.trigger_vectorize_memory() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_workflow_updated_at() SET search_path = public;
ALTER FUNCTION public.conv_messages_broadcast() SET search_path = public;

-- ====================================================================
-- PHASE 3: PERFORMANCE & MONITORING
-- ====================================================================

-- 3.1 Add critical database indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_timestamp 
  ON public.conversation_messages(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_type 
  ON public.conversation_messages(message_type) 
  WHERE message_type = 'user';

CREATE INDEX IF NOT EXISTS idx_memory_contexts_user_session 
  ON public.memory_contexts(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_memory_contexts_importance 
  ON public.memory_contexts(importance_score DESC) 
  WHERE importance_score > 0.7;

CREATE INDEX IF NOT EXISTS idx_eliza_activity_log_type_created 
  ON public.eliza_activity_log(activity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created 
  ON public.webhook_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_frontend_events_type_occurred 
  ON public.frontend_events(event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_function_created 
  ON public.api_call_logs(function_name, created_at DESC);

-- 3.2 Create rate limiting infrastructure
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_lookup 
  ON public.rate_limits(identifier, endpoint, window_start);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to increment rate limit counters
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (identifier, endpoint, window_start)
  VALUES (p_identifier, p_endpoint, now())
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
END;
$$;

-- 3.3 Create system health monitoring view
CREATE OR REPLACE VIEW public.system_health_summary AS
SELECT
  (SELECT COUNT(*) FROM public.frontend_health_checks 
   WHERE check_timestamp > now() - interval '1 hour' 
   AND status = 'online') as frontend_uptime_checks,
  (SELECT COUNT(*) FROM public.vercel_function_logs 
   WHERE invoked_at > now() - interval '1 hour' 
   AND status = 'error') as recent_function_errors,
  (SELECT COUNT(*) FROM public.conversation_messages 
   WHERE timestamp > now() - interval '1 hour') as messages_last_hour,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
  (SELECT COUNT(*) FROM public.conversation_sessions WHERE is_active = true) as active_sessions,
  now() as checked_at;

-- Grant access to system_health_summary view
GRANT SELECT ON public.system_health_summary TO anon, authenticated, service_role;