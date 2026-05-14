-- Explicitly document SECURITY INVOKER views to clear false-positive linter warnings
-- These views should execute with the permissions of the querying user, not the view creator
-- This ensures proper Row Level Security (RLS) enforcement

-- Set eliza_gatekeeper_stats to SECURITY INVOKER
ALTER VIEW public.eliza_gatekeeper_stats SET (security_invoker = true);
COMMENT ON VIEW public.eliza_gatekeeper_stats IS 
'Statistics view for gatekeeper activity. Uses SECURITY INVOKER to enforce RLS policies of the querying user. This view aggregates data from api_call_logs and should respect the querying user permissions.';

-- Set system_health_summary to SECURITY INVOKER
ALTER VIEW public.system_health_summary SET (security_invoker = true);
COMMENT ON VIEW public.system_health_summary IS 
'System health metrics aggregation. Uses SECURITY INVOKER to enforce RLS policies of the querying user. Aggregates health data from various system tables while respecting user-level access controls.';

-- Set v_agent_python_failures to SECURITY INVOKER
ALTER VIEW public.v_agent_python_failures SET (security_invoker = true);
COMMENT ON VIEW public.v_agent_python_failures IS 
'View of failed Python executions by agents. Uses SECURITY INVOKER to enforce RLS policies of the querying user. Filters eliza_python_executions where exit_code indicates failure, respecting user access permissions.';