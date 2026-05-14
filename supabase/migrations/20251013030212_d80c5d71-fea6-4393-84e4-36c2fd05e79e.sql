-- Phase 3: Archive Old Python Executions
-- Moves executions >30 days old to archive table to reduce table scan size
-- Expected impact: 50-70% reduction in main table size, faster queries

-- Create archive table
CREATE TABLE IF NOT EXISTS public.eliza_python_executions_archive (
    LIKE public.eliza_python_executions INCLUDING ALL
);

-- Add comment
COMMENT ON TABLE public.eliza_python_executions_archive IS 
'Archive of Python executions older than 30 days. Moved to reduce table scan size and improve query performance.';

-- Copy old executions to archive
INSERT INTO public.eliza_python_executions_archive
SELECT * FROM public.eliza_python_executions
WHERE created_at < NOW() - INTERVAL '30 days'
ON CONFLICT DO NOTHING;

-- Delete archived records from main table
DELETE FROM public.eliza_python_executions
WHERE created_at < NOW() - INTERVAL '30 days';

-- Analyze table to update statistics
ANALYZE public.eliza_python_executions;

-- Create view that unions both tables for historical queries
CREATE OR REPLACE VIEW public.eliza_python_executions_all AS
SELECT * FROM public.eliza_python_executions
UNION ALL
SELECT * FROM public.eliza_python_executions_archive;

-- Grant permissions
GRANT SELECT ON public.eliza_python_executions_all TO anon, authenticated, service_role;

-- Add comment
COMMENT ON VIEW public.eliza_python_executions_all IS 
'Union of current and archived Python executions. Use this view for historical analysis without performance impact.';