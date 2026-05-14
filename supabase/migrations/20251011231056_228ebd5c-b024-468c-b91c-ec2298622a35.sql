-- Create comprehensive system performance tracking infrastructure

-- 1. Create system_performance_logs table for historical health tracking
CREATE TABLE IF NOT EXISTS public.system_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('hourly', 'daily', 'on-demand', 'scheduled')),
  health_score NUMERIC NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  health_status TEXT NOT NULL CHECK (health_status IN ('healthy', 'warning', 'degraded', 'critical')),
  agent_stats JSONB NOT NULL DEFAULT '{}',
  task_stats JSONB NOT NULL DEFAULT '{}',
  python_execution_stats JSONB NOT NULL DEFAULT '{}',
  api_health_stats JSONB NOT NULL DEFAULT '{}',
  conversation_stats JSONB NOT NULL DEFAULT '{}',
  workflow_stats JSONB NOT NULL DEFAULT '{}',
  learning_stats JSONB NOT NULL DEFAULT '{}',
  skill_gap_stats JSONB NOT NULL DEFAULT '{}',
  issues_detected JSONB[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for system_performance_logs
CREATE INDEX IF NOT EXISTS idx_system_performance_logs_recorded_at 
  ON public.system_performance_logs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_performance_logs_snapshot_type 
  ON public.system_performance_logs(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_system_performance_logs_health_status 
  ON public.system_performance_logs(health_status);
CREATE INDEX IF NOT EXISTS idx_system_performance_logs_health_score 
  ON public.system_performance_logs(health_score DESC);

-- RLS policies for system_performance_logs
ALTER TABLE public.system_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view performance logs"
  ON public.system_performance_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manages performance logs"
  ON public.system_performance_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Create api_call_logs table for edge function performance tracking
CREATE TABLE IF NOT EXISTS public.api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_time_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'pending')),
  error_message TEXT,
  request_payload JSONB,
  response_data JSONB,
  caller_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for api_call_logs
CREATE INDEX IF NOT EXISTS idx_api_call_logs_function_name 
  ON public.api_call_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_called_at 
  ON public.api_call_logs(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_status 
  ON public.api_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_execution_time 
  ON public.api_call_logs(execution_time_ms DESC NULLS LAST);

-- RLS policies for api_call_logs
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view API call logs"
  ON public.api_call_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manages API call logs"
  ON public.api_call_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Create autonomous_actions_log table for tracking Eliza's decisions
CREATE TABLE IF NOT EXISTS public.autonomous_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL,
  trigger_reason TEXT NOT NULL,
  action_details JSONB NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'partial_success', 'failed', 'pending')),
  impact_assessment JSONB DEFAULT '{}',
  learning_notes TEXT,
  confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for autonomous_actions_log
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_timestamp 
  ON public.autonomous_actions_log(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_type 
  ON public.autonomous_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_outcome 
  ON public.autonomous_actions_log(outcome);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_trigger 
  ON public.autonomous_actions_log(trigger_reason);

-- RLS policies for autonomous_actions_log
ALTER TABLE public.autonomous_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view autonomous actions"
  ON public.autonomous_actions_log
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manages autonomous actions"
  ON public.autonomous_actions_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create helper view for performance trends (24-hour rolling)
CREATE OR REPLACE VIEW public.v_performance_trends_24h AS
SELECT 
  DATE_TRUNC('hour', recorded_at) as hour,
  AVG(health_score) as avg_health_score,
  MIN(health_score) as min_health_score,
  MAX(health_score) as max_health_score,
  MODE() WITHIN GROUP (ORDER BY health_status) as most_common_status,
  COUNT(*) as snapshot_count
FROM public.system_performance_logs
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', recorded_at)
ORDER BY hour DESC;

-- Create helper view for health history (daily averages)
CREATE OR REPLACE VIEW public.v_health_history_daily AS
SELECT 
  DATE_TRUNC('day', recorded_at) as date,
  AVG(health_score) as avg_health_score,
  MIN(health_score) as min_health_score,
  MAX(health_score) as max_health_score,
  COUNT(*) as checks_performed,
  COUNT(*) FILTER (WHERE health_status = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE health_status = 'degraded') as degraded_count,
  COUNT(*) FILTER (WHERE health_status = 'warning') as warning_count,
  COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_count
FROM public.system_performance_logs
GROUP BY DATE_TRUNC('day', recorded_at)
ORDER BY date DESC;

-- Create helper view for critical incidents
CREATE OR REPLACE VIEW public.v_critical_incidents AS
SELECT 
  id,
  recorded_at,
  health_score,
  health_status,
  issues_detected,
  recommendations,
  EXTRACT(EPOCH FROM (LEAD(recorded_at) OVER (ORDER BY recorded_at) - recorded_at)) / 60 as duration_minutes
FROM public.system_performance_logs
WHERE health_status IN ('critical', 'degraded')
ORDER BY recorded_at DESC;

-- Log the infrastructure creation
INSERT INTO public.eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) VALUES (
  'system_enhancement',
  'Performance Tracking Infrastructure Created',
  'Created system_performance_logs, api_call_logs, and autonomous_actions_log tables with comprehensive indexes and helper views for long-term performance monitoring',
  'completed',
  jsonb_build_object(
    'tables_created', ARRAY['system_performance_logs', 'api_call_logs', 'autonomous_actions_log'],
    'views_created', ARRAY['v_performance_trends_24h', 'v_health_history_daily', 'v_critical_incidents'],
    'indexes_created', 14,
    'purpose', 'Enable Eliza to track and learn from historical system performance patterns'
  )
);