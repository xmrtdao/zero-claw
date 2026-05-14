-- Create monitoring view for Eliza Gatekeeper statistics
CREATE OR REPLACE VIEW public.eliza_gatekeeper_stats AS
SELECT
  metadata->>'source' as source,
  metadata->>'target' as target,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_calls,
  COUNT(*) FILTER (WHERE status = 'error') as failed_calls,
  AVG((metadata->>'execution_time_ms')::numeric) as avg_duration_ms,
  MAX(created_at) as last_call_at
FROM public.eliza_activity_log
WHERE activity_type = 'gatekeeper_call'
GROUP BY source, target
ORDER BY total_calls DESC;

-- Grant access to view
GRANT SELECT ON public.eliza_gatekeeper_stats TO authenticated;
GRANT SELECT ON public.eliza_gatekeeper_stats TO anon;
GRANT SELECT ON public.eliza_gatekeeper_stats TO service_role;

-- Create index for faster gatekeeper activity queries
CREATE INDEX IF NOT EXISTS idx_eliza_activity_gatekeeper 
ON public.eliza_activity_log(activity_type, created_at) 
WHERE activity_type IN ('gatekeeper_call', 'gatekeeper_error', 'schema_protection');