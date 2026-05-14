-- Create unique index on materialized view to enable concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_function_version_performance_unique 
ON function_version_performance (function_name, deployment_version);

-- Now refresh without CONCURRENTLY since it's the first proper refresh
REFRESH MATERIALIZED VIEW function_version_performance;