-- Fix security definer views by recreating them as SECURITY INVOKER
-- This ensures they use the querying user's permissions instead of the creator's

DROP VIEW IF EXISTS public.v_performance_trends_24h CASCADE;
DROP VIEW IF EXISTS public.v_health_history_daily CASCADE;
DROP VIEW IF EXISTS public.v_critical_incidents CASCADE;

-- Recreate performance trends view with SECURITY INVOKER
CREATE VIEW public.v_performance_trends_24h 
WITH (security_invoker=true)
AS
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

-- Recreate health history view with SECURITY INVOKER
CREATE VIEW public.v_health_history_daily 
WITH (security_invoker=true)
AS
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

-- Recreate critical incidents view with SECURITY INVOKER
CREATE VIEW public.v_critical_incidents 
WITH (security_invoker=true)
AS
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

-- Log the security fix
INSERT INTO public.eliza_activity_log (
  activity_type,
  title,
  description,
  status,
  metadata
) VALUES (
  'security_fix',
  'Views Updated to SECURITY INVOKER',
  'Fixed security definer views by recreating with security_invoker=true to use querying user permissions',
  'completed',
  jsonb_build_object(
    'views_fixed', ARRAY['v_performance_trends_24h', 'v_health_history_daily', 'v_critical_incidents'],
    'security_issue', 'security_definer_view',
    'resolution', 'Recreated views with SECURITY INVOKER'
  )
);