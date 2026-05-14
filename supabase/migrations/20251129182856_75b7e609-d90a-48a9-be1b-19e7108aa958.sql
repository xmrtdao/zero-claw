-- Add new columns for enhanced tool tracking
ALTER TABLE eliza_function_usage 
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS tool_category TEXT DEFAULT 'general';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_function_usage_session ON eliza_function_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_function_usage_category ON eliza_function_usage(tool_category);
CREATE INDEX IF NOT EXISTS idx_function_usage_user ON eliza_function_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_function_usage_created_category ON eliza_function_usage(created_at, tool_category);

-- Create materialized view for dashboard analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS tool_usage_dashboard AS
SELECT 
  tool_category,
  function_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as success_rate,
  AVG(execution_time_ms)::int as avg_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::int as p95_time_ms,
  MAX(created_at) as last_call,
  COUNT(DISTINCT executive_name) as unique_executives,
  COUNT(DISTINCT session_id) as unique_sessions
FROM eliza_function_usage
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY tool_category, function_name
ORDER BY total_calls DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_usage_dashboard_pk 
ON tool_usage_dashboard(tool_category, function_name);

-- Create refresh function for cron
CREATE OR REPLACE FUNCTION refresh_tool_usage_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tool_usage_dashboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing records with tool categories based on function name
UPDATE eliza_function_usage SET tool_category = 
  CASE 
    WHEN function_name IN ('execute_python', 'run_code') THEN 'python'
    WHEN function_name LIKE '%GitHub%' OR function_name LIKE '%github%' OR function_name IN ('createGitHubIssue', 'createGitHubDiscussion', 'listGitHubIssues') THEN 'github'
    WHEN function_name IN ('list_agents', 'spawn_agent', 'assign_task', 'list_tasks', 'update_agent_status', 'update_task_status', 'delete_task', 'get_agent_workload', 'auto_assign_tasks', 'rebalance_workload') THEN 'agent'
    WHEN function_name IN ('check_system_status', 'check_ecosystem_health', 'generate_health_report', 'system-status', 'system-health', 'ecosystem-monitor') THEN 'system'
    WHEN function_name IN ('propose_new_edge_function', 'vote_on_function_proposal', 'list_function_proposals') THEN 'governance'
    WHEN function_name LIKE 'consult_%' OR function_name LIKE 'superduper%' OR function_name = 'route_to_superduper_agent' THEN 'superduper'
    WHEN function_name IN ('get_function_usage_analytics', 'get_edge_function_logs', 'get_function_version_analytics') THEN 'analytics'
    WHEN function_name IN ('qualify_lead', 'identify_service_interest', 'generate_stripe_payment_link', 'create_user_profile_from_session') THEN 'acquisition'
    WHEN function_name IN ('invoke_edge_function', 'call_edge_function') THEN 'edge_function'
    WHEN function_name LIKE '%workflow%' THEN 'workflow'
    ELSE 'general'
  END
WHERE tool_category IS NULL OR tool_category = 'general';