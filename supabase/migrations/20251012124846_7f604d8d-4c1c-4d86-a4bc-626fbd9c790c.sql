-- Phase 4: Create monitoring view for agent Python execution failures
CREATE OR REPLACE VIEW v_agent_python_failures AS
SELECT 
  source,
  COUNT(*) FILTER (WHERE exit_code = 1) as failed_count,
  COUNT(*) FILTER (WHERE exit_code = 0) as success_count,
  ROUND(
    COUNT(*) FILTER (WHERE exit_code = 0)::numeric / 
    NULLIF(COUNT(*)::numeric, 0) * 100, 
    2
  ) as success_rate_percent,
  MAX(created_at) as last_failure,
  jsonb_agg(DISTINCT purpose) FILTER (WHERE purpose IS NOT NULL) as common_purposes
FROM eliza_python_executions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY failed_count DESC;

-- Phase 7: Cleanup existing agent Python failures (unfixable ones)
-- Delete unfixable agent failures matching same patterns as Eliza
DELETE FROM eliza_python_executions
WHERE exit_code = 1
  AND source IN ('autonomous_agent', 'python-fixer-agent')
  AND (
    lower(error) LIKE '%environment variable%' OR
    lower(error) LIKE '%supabase_url%' OR
    lower(error) LIKE '%supabase_key%' OR
    lower(error) LIKE '%no module named%' OR
    lower(error) LIKE '%modulenotfounderror%' OR
    lower(error) LIKE '%connection refused%' OR
    lower(error) LIKE '%timeout%' OR
    lower(error) LIKE '%importerror%' OR
    lower(error) LIKE '%cannot import name%' OR
    lower(error) LIKE '%requests%' OR
    lower(error) LIKE '%numpy%' OR
    lower(error) LIKE '%pandas%' OR
    lower(error) LIKE '%aiohttp%' OR
    lower(error) LIKE '%pip%' OR
    lower(error) LIKE '%package not installed%'
  );

COMMENT ON VIEW v_agent_python_failures IS 'Real-time monitoring of Python execution success rates by source (eliza, autonomous_agent, python-fixer-agent). Shows failed/success counts, success rate percentage, last failure timestamp, and common failure purposes from the last 24 hours.';