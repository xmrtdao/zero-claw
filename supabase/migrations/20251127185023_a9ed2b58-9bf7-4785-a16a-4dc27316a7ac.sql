-- Backfill from edge_function_logs using correct column names
INSERT INTO eliza_function_usage (function_name, success, execution_time_ms, error_message, context, invoked_at, deployment_version)
SELECT 
  function_name,
  COALESCE(status_code >= 200 AND status_code < 400, true) as success,
  execution_time_ms,
  CASE WHEN status_code >= 400 THEN event_message ELSE NULL END as error_message,
  metadata::text as context,
  timestamp as invoked_at,
  'backfill_edge_logs' as deployment_version
FROM edge_function_logs
WHERE function_name IS NOT NULL;

-- Backfill from api_call_logs
INSERT INTO eliza_function_usage (function_name, success, execution_time_ms, error_message, context, invoked_at, deployment_version)
SELECT 
  function_name,
  status = 'success' as success,
  execution_time_ms,
  error_message,
  caller_context::text as context,
  called_at as invoked_at,
  'backfill_api_logs' as deployment_version
FROM api_call_logs
WHERE function_name IS NOT NULL;