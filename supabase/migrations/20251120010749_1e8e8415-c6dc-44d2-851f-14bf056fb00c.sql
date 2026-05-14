-- Add version tracking to eliza_function_usage
ALTER TABLE public.eliza_function_usage 
ADD COLUMN IF NOT EXISTS deployment_version TEXT,
ADD COLUMN IF NOT EXISTS function_hash TEXT,
ADD COLUMN IF NOT EXISTS deployment_id TEXT,
ADD COLUMN IF NOT EXISTS git_commit_hash TEXT;

-- Add indexes for version-based queries
CREATE INDEX IF NOT EXISTS idx_eliza_function_usage_deployment_version 
ON public.eliza_function_usage(deployment_version);

CREATE INDEX IF NOT EXISTS idx_eliza_function_usage_function_version 
ON public.eliza_function_usage(function_name, deployment_version);

CREATE INDEX IF NOT EXISTS idx_eliza_function_usage_function_hash 
ON public.eliza_function_usage(function_hash);

-- Create materialized view for version performance comparison
CREATE MATERIALIZED VIEW IF NOT EXISTS public.function_version_performance AS
SELECT 
  function_name,
  deployment_version,
  function_hash,
  COUNT(*) as total_invocations,
  COUNT(*) FILTER (WHERE success = true) as successful_calls,
  COUNT(*) FILTER (WHERE success = false) as failed_calls,
  ROUND(
    (COUNT(*) FILTER (WHERE success = true)::NUMERIC / 
     NULLIF(COUNT(*), 0)::NUMERIC * 100), 
    2
  ) as success_rate_pct,
  ROUND(AVG(execution_time_ms)::NUMERIC, 2) as avg_execution_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC, 2) as median_execution_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC, 2) as p95_execution_ms,
  MIN(execution_time_ms) as min_execution_ms,
  MAX(execution_time_ms) as max_execution_ms,
  MAX(invoked_at) as last_invoked_at,
  MIN(invoked_at) as first_invoked_at,
  -- Stability score (0-100): success rate weighted with consistency
  ROUND(
    (COUNT(*) FILTER (WHERE success = true)::NUMERIC / 
     NULLIF(COUNT(*), 0)::NUMERIC * 100) * 
    (1 - (STDDEV(execution_time_ms) / NULLIF(AVG(execution_time_ms), 0))),
    2
  ) as stability_score
FROM public.eliza_function_usage
WHERE deployment_version IS NOT NULL
GROUP BY function_name, deployment_version, function_hash;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_function_version_performance_lookup
ON public.function_version_performance(function_name, deployment_version);

-- Create refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_function_version_performance()
RETURNS void
LANGUAGE sql
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.function_version_performance;
$$;

-- Grant permissions
GRANT SELECT ON public.function_version_performance TO service_role;
GRANT EXECUTE ON FUNCTION refresh_function_version_performance() TO service_role;

-- Add helpful comments
COMMENT ON COLUMN public.eliza_function_usage.deployment_version IS 'Semantic version or timestamp of function deployment';
COMMENT ON COLUMN public.eliza_function_usage.function_hash IS 'Content hash of function code for change detection';
COMMENT ON COLUMN public.eliza_function_usage.deployment_id IS 'Unique deployment identifier from CI/CD';
COMMENT ON COLUMN public.eliza_function_usage.git_commit_hash IS 'Git commit SHA that deployed this version';
COMMENT ON MATERIALIZED VIEW public.function_version_performance IS 'Aggregated performance metrics per function version for regression analysis';